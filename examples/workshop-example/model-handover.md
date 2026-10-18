# Fictional training cases and model handover

Every row, category, prepared output and handover below is authored fictional training material. Revision `training-v2` names this supplied source sheet. No real collection, service queue or project record was used.

## Training source

The exercise task is to prepare a category summary from the prepared table. The supplied codebook permits a category total only where a category is already assigned. An unresolved row must remain separately visible. The receiver may summarize assigned rows and flag missing categories. Only the designated fictional decision owner may decide the ambiguous row. This codebook applies equally to the two cases below.

## Case U University

Case U represents an invented teaching-collection catalogue. The fictional collection lead owns category decisions. Source rows at `training-v2` are as follows.

| Item ID | Recorded description | Recorded category |
| --- | --- | --- |
| U1 | Wooden counting board used in a classroom | teaching object |
| U2 | Labelled limestone sample for material comparison | material specimen |
| U3 | Printed geometry card used in a classroom | teaching object |
| U4 | Sample block, use unspecified | Unassigned |

The category vocabulary maps `teaching object` to `TEACHING` and `material specimen` to `SPECIMEN`. U4 has no assigned category. The phrase “sample block” permits more than one interpretation within the authored case, and the source supplies no decision between them.

## Prepared university table

The following completed authored transformation supplies the receiver's starting artifact. It applies the vocabulary mapping above and preserves U4 as unresolved. It represents a finished example result, without implying that a person or agent executed a transformation.

| Item ID | Category code | Source reference | State |
| --- | --- | --- | --- |
| U1 | TEACHING | Case U, U1 | Mapped from recorded category |
| U2 | SPECIMEN | Case U, U2 | Mapped from recorded category |
| U3 | TEACHING | Case U, U3 | Mapped from recorded category |
| U4 | UNRESOLVED | Case U, U4 | Decision required |

## Case C Company

Case C represents an invented training queue. The fictional service owner owns routing decisions. Source rows at `training-v2` are as follows.

| Request ID | Recorded wording | Recorded routing category |
| --- | --- | --- |
| C1 | Password reset for training account | identity access |
| C2 | Change the course shown in the training portal | course administration |
| C3 | Unlock a training account after failed sign-in | identity access |
| C4 | Access request after course transfer | Unassigned |

The category vocabulary maps `identity access` to `ACCESS` and `course administration` to `COURSE`. C4 has no assigned category. Its wording leaves both routing categories possible within the authored case.

## Prepared company table

This completed authored transformation applies the supplied mapping and preserves C4 as unresolved.

| Request ID | Category code | Source reference | State |
| --- | --- | --- | --- |
| C1 | ACCESS | Case C, C1 | Mapped from recorded category |
| C2 | COURSE | Case C, C2 | Mapped from recorded category |
| C3 | ACCESS | Case C, C3 | Mapped from recorded category |
| C4 | UNRESOLVED | Case C, C4 | Decision required |

## Weak handover

> The table is cleaned. Finish the summary and put the sample block in the right category.

This authored weak example fails to locate the table or define “cleaned.” It also delegates a decision that the supplied codebook reserves for the collection lead. The comparison uses RQ-02–RQ-05 and [R2](records.md#r2-receivers-account).

## Completed handover

### Task and source

Resume the category summary for Case U. Use [Prepared university table](#prepared-university-table), source sheet `model-handover.md`, revision `training-v2`. Its evidence is [Case U University](#case-u-university), rows U1–U4 and the adjacent vocabulary mapping. All material is wholly fictional. This satisfies RQ-01, RQ-02 and RQ-06.

### State and evidence

| Statement | Evidence | Limit |
| --- | --- | --- |
| The supplied table maps U1 and U3 to TEACHING. | Source category `teaching object` and the Case U mapping, compared with the prepared rows. | This is the supplied authored result. No execution is claimed. |
| The supplied table maps U2 to SPECIMEN. | Source category `material specimen` and the Case U mapping, compared with the prepared row. | The mapping retains the stated category. |
| U4 remains unresolved. | Source wording “Sample block, use unspecified” and source category “Unassigned”. | Assigning TEACHING or SPECIMEN would add a category decision absent from the source. |
| The category summary remains to be prepared. | Exercise task under [Training source](#training-source). No summary artifact is supplied here. | A prepared input table does not establish a completed summary. |

These statements implement RQ-03. They let the receiver distinguish the authored preparation from the unfinished exercise.

### Next permitted action

Create an exercise output named `summary-u.md`. Group the already assigned rows by category code, list the item IDs in each group and include a separate unresolved section for U4. Check every listed ID against the prepared table and its source row. Stop before assigning a category to U4. The receiver may draft and check the summary. The receiver has no authority to change U4's category or claim that the project is accepted. This implements RQ-04 and RQ-07.

### Open decision and consequence

The fictional collection lead must decide whether U4 belongs to TEACHING or SPECIMEN, or should remain unassigned pending further fictional documentation. The source sheet gives no basis to select one. While that decision is open, the summary can report assigned categories and keep U4 separately visible. A final summary claiming that every item has a category remains blocked. This implements RQ-05.

### Proposed check and its limit

The receiver should compare the category labels, source links and unresolved status row by row, then record the actual finding in W5. This model contains no executed receiver check, independent review or acceptance. A reviewer must inspect the source interpretation separately from the existence of `summary-u.md`, following [R3](records.md#r3-review-instruction).

## Company handover adaptation

For Case C, use [Prepared company table](#prepared-company-table), source revision `training-v2`. Replace item IDs with request IDs and group C1–C3 under ACCESS or COURSE. Keep C4 in the unresolved section. The fictional service owner decides whether its routing is ACCESS, COURSE or remains unassigned pending further fictional clarification. The receiver may prepare `summary-c.md` and check references. The stopping condition is the same, before assigning C4. Every other handover field and review criterion remains applicable under RQ-08.
