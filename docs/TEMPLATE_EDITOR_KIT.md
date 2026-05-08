# Template Editor Kit

`client/template-editor-kit` is the portable entry point for the template editor UI.
Use this kit when another project needs the same toolbar, data tags, editable canvas, table tools, image tools, and preview rendering without copying files one by one.

The bundled table tools include row/column editing, merge/split, cell shading, vertical alignment, and border controls for target, line style, width, and color. The kit also includes page properties for paper size, orientation, and margins.

## Assets

Load the CSS and scripts listed in:

- `client/template-editor-kit/manifest.js`

The order of `requiredScripts` matters. The kit depends on the existing editor modules and then exposes:

```js
globalThis.AdmitCardTemplateEditorKit.createTemplateEditor(...)
```

If you want the current AdmitCard tag preset, load `shared/app-config.js` before the required scripts. Other projects can skip that file and pass their own `tags`.

## Browser Usage

```html
<link rel="stylesheet" href="/styles/base.css" />
<link rel="stylesheet" href="/styles/features/templates.css" />
<link rel="stylesheet" href="/styles/features/template-editor.css" />
<link rel="stylesheet" href="/client/template-editor-kit/template-editor-kit.css" />

<div id="editorRoot"></div>
```

After loading the scripts from the manifest:

```js
const editor = AdmitCardTemplateEditorKit.createTemplateEditor({
  root: "#editorRoot",
  initialHtml: "<div class=\"template-doc\"><p>@{이름}</p></div>",
  tags: [
    { id: "name", label: "이름", dataKey: "name" },
    { id: "examNo", label: "수험번호", dataKey: "examineeNo" },
  ],
  previewData: {
    name: "홍길동",
    examineeNo: "123100001",
  },
  buildApiUrl: (path) => path,
  onChange: (html) => {
    console.log(html);
  },
});

editor.insertTag("이름");
const html = editor.getHtml();
const renderedHtml = editor.render({ name: "김지원", examineeNo: "20260001" });
```

Page settings are persisted on the `.template-doc` element as `data-template-page-*` attributes, so another project should keep the saved HTML intact instead of stripping those attributes.

## API

- `setHtml(html, options)`: Replace canvas HTML.
- `getHtml()`: Normalize and return editor HTML.
- `insertTag(tag)`: Insert a configured data tag.
- `insertHtml(html)`: Insert raw HTML at the saved selection.
- `insertImage(file)`: Insert an image file.
- `applyCommand(command, value)`: Run a toolbar command.
- `undo()` / `redo()`: Use the editor history.
- `render(data, html)`: Render data-tag output.
- `renderInto(target, data, html)`: Render into a preview target.
- `destroy()`: Remove listeners and active editor sessions.

## Project Boundary

The kit intentionally does not include AdmitCard-specific storage or workflow:

- template card list
- `/api/templates` save, update, delete, activate calls
- application modals
- examinee database queries
- project-specific page navigation

Those should stay in the host project and call the kit API.
