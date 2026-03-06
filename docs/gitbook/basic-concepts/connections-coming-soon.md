# Connections

## Semble Connection Types

Connections in Semble link two pieces of content with a typed semantic relationship. Each connection has a **source** (A), a **target** (B), and a **relation type** that describes how they relate.

***

| Type              | Lexicon ID   | Description                                       | Example                                                             |
| ----------------- | ------------ | ------------------------------------------------- | ------------------------------------------------------------------- |
| Related (default) | `related`    | A is related to B in some unspecified way         | Paper A and paper B both deal with collective intelligence          |
| Supports          | `supports`   | A provides evidence or reasoning in favor of B    | Dataset A supports the findings of paper B                          |
| Opposes           | `opposes`    | A provides evidence or reasoning against B        | Evidence A contradicts claim B                                      |
| Addresses         | `addresses`  | A responds to or answers B                        | Paper A addresses the open question posed in paper B                |
| Helpful           | `helpful`    | A is helpful for contextualizing/understanding B  | Essay A offers a thoughtful critique of research paper B            |
| Explainer         | `explainer`  | A explains or summarizes B for a broader audience | Thread A walks through the key findings of paper B                  |
| Leads to          | `leads_to`   | A led me to B — a trail segment worth walking     | Listening to podcast A led me to find book B                        |
| Supplements       | `supplement` | A is supplemental material for B                  | Dataset A accompanies and supports the methods described in paper B |
