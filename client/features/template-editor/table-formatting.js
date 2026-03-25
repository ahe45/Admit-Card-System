(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorTableFormatting = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorTableFormattingController({
    getTemplateEditorFormattingTargetCells,
    isTemplateTableCellEmpty,
    syncTemplateEditorContent,
  }) {
    function isTemplateEditorCellBold(cell) {
      const fontWeight = String(cell?.style.fontWeight || window.getComputedStyle(cell || document.body).fontWeight || "")
        .trim()
        .toLowerCase();

      if (fontWeight === "bold") {
        return true;
      }

      const numericFontWeight = Number(fontWeight);
      return Number.isFinite(numericFontWeight) && numericFontWeight >= 600;
    }

    function isTemplateEditorCellItalic(cell) {
      const fontStyle = String(cell?.style.fontStyle || window.getComputedStyle(cell || document.body).fontStyle || "")
        .trim()
        .toLowerCase();
      return fontStyle.includes("italic");
    }

    function isTemplateEditorCellUnderlined(cell) {
      const inlineValue = `${cell?.style.textDecorationLine || ""} ${cell?.style.textDecoration || ""}`.toLowerCase();
      const computedStyle = cell ? window.getComputedStyle(cell) : null;
      const computedValue = `${computedStyle?.textDecorationLine || ""} ${computedStyle?.textDecoration || ""}`.toLowerCase();
      return inlineValue.includes("underline") || computedValue.includes("underline");
    }

    function getTemplateEditorCellUnorderedList(cell) {
      if (!cell) {
        return null;
      }

      const meaningfulNodes = Array.from(cell.childNodes).filter((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return String(node.textContent || "").trim() !== "";
        }

        return true;
      });

      return meaningfulNodes.length === 1 && meaningfulNodes[0] instanceof HTMLUListElement ? meaningfulNodes[0] : null;
    }

    function unwrapTemplateEditorCellUnorderedList(cell) {
      const listElement = getTemplateEditorCellUnorderedList(cell);

      if (!listElement) {
        return;
      }

      cell.innerHTML = "";
      const items = Array.from(listElement.children).filter((child) => child.tagName === "LI");

      items.forEach((item, index) => {
        while (item.firstChild) {
          cell.appendChild(item.firstChild);
        }

        if (index < items.length - 1) {
          cell.appendChild(document.createElement("br"));
        }
      });

      if (isTemplateTableCellEmpty(cell)) {
        cell.innerHTML = "<br />";
      }
    }

    function wrapTemplateEditorCellUnorderedList(cell) {
      if (!cell || getTemplateEditorCellUnorderedList(cell)) {
        return;
      }

      const listElement = document.createElement("ul");
      const listItem = document.createElement("li");
      const contentNodes = Array.from(cell.childNodes);
      const hasMeaningfulContent = contentNodes.some((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return String(node.textContent || "").trim() !== "";
        }

        return !(node instanceof HTMLBRElement && contentNodes.length === 1);
      });

      if (!hasMeaningfulContent) {
        listItem.appendChild(document.createElement("br"));
      } else {
        contentNodes.forEach((node) => {
          listItem.appendChild(node);
        });
      }

      listElement.appendChild(listItem);
      cell.replaceChildren(listElement);
    }

    function applyTemplateEditorTableSelectionCommand(command, value = "") {
      const targetCells = getTemplateEditorFormattingTargetCells();

      if (targetCells.length === 0) {
        return false;
      }

      if (command === "bold") {
        const shouldApplyBold = !targetCells.every((cell) => isTemplateEditorCellBold(cell));
        targetCells.forEach((cell) => {
          cell.style.fontWeight = shouldApplyBold ? "700" : "400";
        });
      } else if (command === "italic") {
        const shouldApplyItalic = !targetCells.every((cell) => isTemplateEditorCellItalic(cell));
        targetCells.forEach((cell) => {
          cell.style.fontStyle = shouldApplyItalic ? "italic" : "normal";
        });
      } else if (command === "underline") {
        const shouldApplyUnderline = !targetCells.every((cell) => isTemplateEditorCellUnderlined(cell));
        targetCells.forEach((cell) => {
          if (shouldApplyUnderline) {
            cell.style.textDecoration = "underline";
            cell.style.textDecorationLine = "underline";
            return;
          }

          cell.style.removeProperty("text-decoration");
          cell.style.removeProperty("text-decoration-line");
        });
      } else if (
        command === "justifyLeft" ||
        command === "justifyCenter" ||
        command === "justifyRight" ||
        command === "justifyFull"
      ) {
        const textAlignValue =
          command === "justifyCenter" ? "center" : command === "justifyRight" ? "right" : command === "justifyFull" ? "justify" : "left";
        targetCells.forEach((cell) => {
          cell.style.textAlign = textAlignValue;
        });
      } else if (command === "insertUnorderedList") {
        const shouldApplyList = !targetCells.every((cell) => getTemplateEditorCellUnorderedList(cell));
        targetCells.forEach((cell) => {
          if (shouldApplyList) {
            wrapTemplateEditorCellUnorderedList(cell);
            return;
          }

          unwrapTemplateEditorCellUnorderedList(cell);
        });
      } else {
        return false;
      }

      syncTemplateEditorContent();
      return true;
    }

    function applyTemplateEditorTableSelectionFontFamily(fontFamily) {
      const targetCells = getTemplateEditorFormattingTargetCells();

      if (targetCells.length === 0) {
        return false;
      }

      targetCells.forEach((cell) => {
        cell.style.fontFamily = fontFamily;
      });

      syncTemplateEditorContent();
      return true;
    }

    function applyTemplateEditorTableSelectionFontSize(fontSize) {
      const targetCells = getTemplateEditorFormattingTargetCells();

      if (targetCells.length === 0) {
        return false;
      }

      targetCells.forEach((cell) => {
        cell.style.fontSize = `${fontSize}px`;
      });

      syncTemplateEditorContent();
      return true;
    }

    return Object.freeze({
      applyTemplateEditorTableSelectionCommand,
      applyTemplateEditorTableSelectionFontFamily,
      applyTemplateEditorTableSelectionFontSize,
    });
  }

  return Object.freeze({
    createTemplateEditorTableFormattingController,
  });
});
