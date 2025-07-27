# Chakra UI v3 Import Reference

## Component Name Changes from v2 to v3

### Modals/Dialogs
- ❌ `Modal` → ✅ `Dialog`
- Usage: `Dialog.Root`, `Dialog.Backdrop`, `Dialog.Content`, etc.

### Drawers
- ✅ `Drawer` (same name but different API)
- Usage: `Drawer.Root`, `Drawer.Backdrop`, `Drawer.Content`, etc.

### Selects
- ❌ `Select` (simple) → ✅ `Select` (compound)
- Usage: `Select.Root`, `Select.Trigger`, `Select.Content`, etc.

### Stats
- ❌ `Stat`, `StatLabel`, etc. → ✅ `Stat.Root`, `Stat.Label`, etc.

### Tables
- ❌ `Table`, `Thead`, `Tbody`, etc. → ✅ `Table.Root`, `Table.Header`, `Table.Body`, etc.

## How to Avoid Import Errors

1. **Check Documentation First**
   - Always refer to Chakra UI v3 docs before using a component
   - URL: https://www.chakra-ui.com/docs/components/[component-name]

2. **Use Compound Components**
   - v3 uses compound components (e.g., `Dialog.Root` instead of `Modal`)
   - Most components follow the pattern: `Component.Root`, `Component.Header`, etc.

3. **Test Imports Incrementally**
   - Import and use one component at a time
   - Run the dev server to catch errors early

4. **Common Patterns in v3**
   ```tsx
   // Dialog/Modal
   <Dialog.Root>
     <Dialog.Backdrop />
     <Dialog.Positioner>
       <Dialog.Content>
         <Dialog.Header>
           <Dialog.Title>Title</Dialog.Title>
           <Dialog.CloseTrigger />
         </Dialog.Header>
         <Dialog.Body>Content</Dialog.Body>
         <Dialog.Footer>Actions</Dialog.Footer>
       </Dialog.Content>
     </Dialog.Positioner>
   </Dialog.Root>

   // Select
   <Select.Root>
     <Select.Trigger>
       <Select.ValueText />
     </Select.Trigger>
     <Select.Positioner>
       <Select.Content>
         <Select.Item value="...">
           <Select.ItemText>...</Select.ItemText>
         </Select.Item>
       </Select.Content>
     </Select.Positioner>
   </Select.Root>
   ```

5. **Props Changes**
   - `isOpen` → `open`
   - `onClose` → `onOpenChange`
   - Event handlers often receive objects: `(e) => e.open`

## Quick Reference

| v2 Component | v3 Component | Notes |
|--------------|--------------|-------|
| Modal | Dialog | Complete API change |
| Select (simple) | Select (compound) | Now requires Root, Trigger, etc. |
| Stat, StatLabel | Stat.Root, Stat.Label | Compound pattern |
| Table, Thead | Table.Root, Table.Header | Compound pattern |
| DrawerOverlay | Drawer.Backdrop | Name change |
| ModalOverlay | Dialog.Backdrop | Name change |

## Testing Strategy

1. Always run `npm run dev` after adding new Chakra components
2. Check browser console for import errors
3. Use TypeScript for better autocomplete and error detection
4. When in doubt, check the Chakra UI v3 migration guide