import { UniqueEntityID } from "../../../../../shared/domain/UniqueEntityID";
import { Annotation } from "../../../domain/aggregates/Annotation";
import {
  AnnotationNote,
  AnnotationTemplateId,
  CuratorId,
  PublishedRecordId,
} from "../../../domain/value-objects";
import { PublishedRecordDTO, PublishedRecordRefDTO } from "./DTOTypes";
import { URI } from "../../../domain/value-objects/URI";
import { err, ok, Result } from "../../../../../shared/core/Result";
import { AnnotationType } from "../../../domain/value-objects/AnnotationType";
import {
  DyadValue,
  TriadValue,
  RatingValue,
  SingleSelectValue,
  MultiSelectValue,
  AnnotationValue,
} from "../../../domain/value-objects/AnnotationValue";
import {
  AnnotationValueFactory,
  AnnotationValueInput,
} from "../../../domain/AnnotationValueFactory";
import {
  AnnotationFieldDTO,
  AnnotationFieldMapper,
} from "./AnnotationFieldMapper";

// Database representation of an annotation
export interface AnnotationDTO extends PublishedRecordRefDTO {
  id: string;
  curatorId: string;
  url: string;
  annotationFieldId: string;
  annotationField: AnnotationFieldDTO;
  valueType: string;
  valueData: any; // JSON data for the value
  note?: string;
  createdAt: Date;
  templateIds?: string[]; // Array of template IDs this annotation is associated with
}

export class AnnotationMapper {
  public static toDomain(dto: AnnotationDTO): Result<Annotation> {
    try {
      // Create value objects
      const curatorIdOrError = CuratorId.create(dto.curatorId);
      if (curatorIdOrError.isErr()) return err(curatorIdOrError.error);

      const urlOrError = this.createURI(dto.url);
      if (urlOrError.isErr()) return err(urlOrError.error);

      // We need the annotation field object
      if (!dto.annotationField) {
        return err(
          new Error("Annotation field is required but not provided in DTO")
        );
      }

      // Assuming we have a method to convert the field DTO to domain object
      // This would need to be implemented or use an existing mapper
      const annotationFieldResult = AnnotationFieldMapper.toDomain(
        dto.annotationField
      );
      if (annotationFieldResult.isErr()) {
        return err(new Error("Failed to create annotation field from DTO"));
      }

      // Create the appropriate value based on type
      const valueOrError = this.createAnnotationValue(
        dto.valueType,
        dto.valueData
      );
      if (valueOrError.isErr()) return err(valueOrError.error);

      // Create optional note if it exists
      let note: AnnotationNote | undefined;
      if (dto.note) {
        note = AnnotationNote.create(dto.note).unwrap();
      }

      // Create optional published record ID if it exists
      let publishedRecordId: PublishedRecordId | undefined;
      if (dto.publishedRecord) {
        publishedRecordId = PublishedRecordId.create({
          uri: dto.publishedRecord.uri,
          cid: dto.publishedRecord.cid,
        });
      }

      // Create template IDs if they exist
      let templateIds: AnnotationTemplateId[] | undefined;
      if (dto.templateIds && dto.templateIds.length > 0) {
        templateIds = dto.templateIds.map((id) =>
          AnnotationTemplateId.create(new UniqueEntityID(id)).unwrap()
        );
      }

      // Create the annotation
      const annotationOrError = Annotation.create(
        {
          curatorId: curatorIdOrError.value,
          url: urlOrError.value,
          annotationField: annotationFieldResult.value,
          value: valueOrError.value,
          annotationTemplateIds: templateIds,
          note,
          createdAt: dto.createdAt,
          publishedRecordId,
        },
        new UniqueEntityID(dto.id)
      );

      if (annotationOrError.isErr()) return err(annotationOrError.error);

      return ok(annotationOrError.value);
    } catch (error) {
      return err(error as Error);
    }
  }

  private static createURI(url: string): Result<URI> {
    try {
      return ok(new URI(url));
    } catch (error) {
      return err(error as Error);
    }
  }

  private static createAnnotationValue(
    type: string,
    data: any
  ): Result<AnnotationValue> {
    try {
      const annotationType = AnnotationType.create(type);
      return AnnotationValueFactory.create({
        type: annotationType,
        valueInput: data as AnnotationValueInput,
      });
    } catch (error) {
      return err(error as Error);
    }
  }

  public static toPersistence(annotation: Annotation): {
    annotation: {
      id: string;
      curatorId: string;
      url: string;
      annotationFieldId: string;
      valueType: string;
      valueData: AnnotationValueInput;
      note?: string;
      createdAt: Date;
      publishedRecordId?: string;
    };
    annotationField: {
      id: string;
      curatorId: string;
      name: string;
      description: string;
      definition: any;
      createdAt: Date;
      publishedRecordId?: string;
    };
    publishedRecord?: PublishedRecordDTO;
    templateLinks?: {
      id: string;
      annotationId: string;
      templateId: string;
    }[];
  } {
    const value = annotation.value;
    const valueType = value.type.value;
    let valueData: AnnotationValueInput;

    // Extract the appropriate data based on value type
    if (value instanceof DyadValue) {
      valueData = { value: value.value };
    } else if (value instanceof TriadValue) {
      valueData = {
        vertexA: value.vertexA,
        vertexB: value.vertexB,
        vertexC: value.vertexC,
      };
    } else if (value instanceof RatingValue) {
      valueData = { rating: value.rating };
    } else if (value instanceof SingleSelectValue) {
      valueData = { option: value.option };
    } else if (value instanceof MultiSelectValue) {
      valueData = { options: value.options };
    } else {
      throw new Error("Unknown annotation value type");
    }

    // Create template links if they exist
    let templateLinks:
      | { id: string; annotationId: string; templateId: string }[]
      | undefined;
    if (
      annotation.annotationTemplateIds &&
      annotation.annotationTemplateIds.length > 0
    ) {
      templateLinks = annotation.annotationTemplateIds.map((templateId) => ({
        id: new UniqueEntityID().toString(),
        annotationId: annotation.id.toString(),
        templateId: templateId.getValue().toString(),
      }));
    }

    // Create published record data if it exists
    let publishedRecord: PublishedRecordDTO | undefined;
    let publishedRecordId: string | undefined;

    if (annotation.publishedRecordId) {
      const recordId = new UniqueEntityID().toString();
      publishedRecord = {
        id: recordId,
        uri: annotation.publishedRecordId.uri,
        cid: annotation.publishedRecordId.cid,
        recordedAt: new Date(),
      };
      publishedRecordId = recordId;
    }

    // Create the annotation field data
    const field = annotation.annotationField;
    const annotationField = {
      id: field.fieldId.getStringValue(),
      curatorId: field.curatorId.value,
      name: field.name.value,
      description: field.description.value,
      definition: field.definition,
      createdAt: field.createdAt,
      publishedRecordId: field.publishedRecordId
        ? field.publishedRecordId.getValue().uri
        : undefined,
    };

    return {
      annotation: {
        id: annotation.id.toString(),
        curatorId: annotation.curatorId.value,
        url: annotation.url.value,
        annotationFieldId: annotation.annotationFieldId.getStringValue(),
        valueType,
        valueData,
        note: annotation.note?.getValue(),
        createdAt: annotation.createdAt || new Date(),
        publishedRecordId,
      },
      annotationField,
      publishedRecord,
      templateLinks,
    };
  }
}
