CREATE INDEX "connections_curator_claim_idx" ON "connections" USING btree (
    "curator_id",
    "source_value",
    "target_value",
    "connection_type"
);