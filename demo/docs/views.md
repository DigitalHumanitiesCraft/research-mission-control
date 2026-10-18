# Adding a view

The existing mission-control/navigation.js route array is the only view registry. A route has a stable key, relative HTML file and visible label. Keep keys stable when a label changes. Existing keys retain their URLs, history and source/task identity.

1. Add one route to that array. Do not copy the registry into another view or adapter. The settings normalizer appends a new key without destroying a person's existing order. Unknown/duplicate stored keys are normalized; Overview remains visible; a directly opened hidden route remains reachable.
2. Add a semantic HTML page with the existing base/navigation/shell styles and loading order. Use the shared header rather than repeating navigation HTML. Read the data-independent header and an adjacent view before choosing dependencies. Match the existing classic window contracts where required; use native modules for module-based controllers.
3. Keep project/source/task logic in the shared model owner. A view controller renders its bounded task and stores only appropriate local presentation state. Reuse the existing source helper and shared conversation component for full-text expansion, copying and manual fallback. An optional editorial data asset may enrich a result but cannot invent state or authority.
4. Add the new HTML/code/style members to the explicit export manifest with their correct license. Every src/import/href destination must exist under the deployment subpath. A view that supports a result return also needs an explicit safe entry in ergebnisse.js returnTarget; this separate allowlist is a trust boundary, not a second navigation registry.
5. Check direct URL, history/back/forward, active/hidden navigation, keyboard focus and restoration, narrow light/dark reflow, missing data and blocked storage. Run the package browser check and extend it with the actual user task. New code files must be included in the manifest before its hashes are refreshed.

There is no view factory, personal Second Brain assumption, account requirement or live-agent inference. Shared UI/model code remains the same for the synthetic example and an explicitly selected project-source adapter.
