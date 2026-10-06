# SelectField UI contract

## Component boundary

New src/components/ui/select.tsx exports SelectField. Required props: id, options (readonly array of value:string, label:string, optional disabled:boolean), value:string, onValueChange(value:string):void. Optional props: name, disabled, placeholder, aria-invalid, aria-describedby, className. Forward a ref to the interactive trigger if supplied. Associate external FieldLabel htmlFor with that trigger, not a hidden input.

Use existing Base UI Select parts, option text and indicator, portal and positioner. Prevent accidental form submission from the trigger. Preserve normal keyboard typeahead, Arrow/Home/End navigation, Enter/Space, Escape and Tab semantics. Do not add a menu role to a value selector.

## Empty values

Dashboard options include {value:'', label:'All'}; it is a real enabled value, distinct from absence. All is displayed when no parameter exists and selecting it clears only that parameter.

Job form uses placeholder='Select a client' and internal null for external ''. Provide an explicit Select a client clearing choice mapped to absence, followed by ID-valued client items. Callback normalises internal null back to ''. Empty clients disable the trigger and display No clients available. Name remains client_id. Never submit a label or synthetic sentinel value.

## Unknown and duplicate values

FilterBar adds a disabled option for a nonempty current URL value absent from current options, labelled with the original value plus “(unavailable)”. Do not mutate the URL while rendering. Options with matching labels in JobForm stay distinct by client ID; selection never uses array index or label as identity.

## Test contract

Find triggers through their visible labels and choices by role=option within the opened listbox. Test exact values through URL or mocked createJob payload, not native DOM value assertions. Existing countClientOptions returns 1 + real client count; for zero clients return 1 without attempting to open a disabled trigger. Close any popup opened by a counting helper. Existing seeded scenarios must execute rather than silently skip on local fixtures.
