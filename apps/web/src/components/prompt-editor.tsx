"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  EditorState,
  FORMAT_TEXT_COMMAND,
  TextFormatType,
  KEY_DOWN_COMMAND,
  COMMAND_PRIORITY_HIGH,
} from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import {
  TRANSFORMERS,
  $convertToMarkdownString,
  $convertFromMarkdownString,
} from "@lexical/markdown";
import {
  HeadingNode,
  QuoteNode,
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  HeadingTagType,
} from "@lexical/rich-text";
import {
  ListNode,
  ListItemNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  $isListNode,
} from "@lexical/list";
import { $setBlocksType } from "@lexical/selection";
import { $getNearestNodeOfType } from "@lexical/utils";
import {
  CodeNode,
  CodeHighlightNode,
  $createCodeNode,
  $isCodeNode,
  registerCodeHighlighting,
} from "@lexical/code";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { HorizontalRuleNode } from "@lexical/extension";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { cn } from "@workspace/ui/lib/utils";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  FileCode,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Pilcrow,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

type EditorMode = "rich" | "plain";

// Theme for the prompt editor
const theme = {
  root: "h-full",
  paragraph: "mb-2 last:mb-0",
  heading: {
    h1: "text-2xl font-bold mb-3",
    h2: "text-xl font-semibold mb-2",
    h3: "text-lg font-medium mb-2",
    h4: "text-base font-medium mb-1",
    h5: "text-sm font-medium mb-1",
    h6: "text-xs font-medium mb-1",
  },
  list: {
    ul: "list-disc ml-4 mb-2",
    ol: "list-decimal ml-4 mb-2",
    listitem: "mb-1",
    nested: {
      listitem: "list-disc ml-4",
    },
  },
  quote:
    "border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground mb-2",
  code: "bg-muted px-1.5 py-0.5 rounded font-mono text-sm",
  codeHighlight: {
    atrule: "text-purple-500",
    attr: "text-blue-500",
    boolean: "text-orange-500",
    builtin: "text-cyan-500",
    cdata: "text-gray-500",
    char: "text-green-500",
    class: "text-yellow-500",
    "class-name": "text-yellow-500",
    comment: "text-gray-500 italic",
    constant: "text-orange-500",
    deleted: "text-red-500",
    doctype: "text-gray-500",
    entity: "text-cyan-500",
    function: "text-blue-500",
    important: "text-red-500 font-bold",
    inserted: "text-green-500",
    keyword: "text-purple-500",
    namespace: "text-cyan-500",
    number: "text-orange-500",
    operator: "text-gray-600 dark:text-gray-400",
    prolog: "text-gray-500",
    property: "text-blue-500",
    punctuation: "text-gray-600 dark:text-gray-400",
    regex: "text-orange-500",
    selector: "text-green-500",
    string: "text-green-500",
    symbol: "text-orange-500",
    tag: "text-red-500",
    url: "text-cyan-500 underline",
    variable: "text-orange-500",
  },
  link: "text-primary underline cursor-pointer",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    code: "bg-muted px-1.5 py-0.5 rounded font-mono text-sm",
  },
  hr: "border-t border-border my-4",
};

const editorNodes = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  LinkNode,
  AutoLinkNode,
  HorizontalRuleNode,
];

// TODO: Hook up to Sentry in the future
function onError(error: Error) {
  console.error("[PromptEditor]", error);
}

// Toolbar button component
function ToolbarButton({
  onClick,
  isActive,
  disabled,
  icon: Icon,
  tooltip,
  shortcut,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  shortcut?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            isActive && "bg-accent text-accent-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-2">
        <span>{tooltip}</span>
        {shortcut && (
          <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// Divider for toolbar sections
function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1" />;
}

// Toolbar plugin component
function ToolbarPlugin({
  disabled,
  mode,
  onModeChange,
}: {
  disabled?: boolean;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [blockType, setBlockType] = useState<string>("paragraph");

  // Update toolbar state based on selection
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        // Update text format states
        setIsBold(selection.hasFormat("bold"));
        setIsItalic(selection.hasFormat("italic"));
        setIsStrikethrough(selection.hasFormat("strikethrough"));
        setIsCode(selection.hasFormat("code"));

        // Update block type
        const anchorNode = selection.anchor.getNode();
        const element =
          anchorNode.getKey() === "root"
            ? anchorNode
            : anchorNode.getTopLevelElementOrThrow();

        if ($isHeadingNode(element)) {
          setBlockType(element.getTag());
        } else if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(anchorNode, ListNode);
          setBlockType(parentList?.getListType() ?? "paragraph");
        } else if ($isCodeNode(element)) {
          setBlockType("code");
        } else {
          setBlockType(element.getType());
        }
      });
    });
  }, [editor]);

  const formatText = useCallback(
    (format: TextFormatType) => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    [editor]
  );

  const formatHeading = useCallback(
    (headingTag: HeadingTagType) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          if (blockType === headingTag) {
            // Toggle off - convert back to paragraph
            $setBlocksType(selection, () => $createParagraphNode());
          } else {
            $setBlocksType(selection, () => $createHeadingNode(headingTag));
          }
        }
      });
    },
    [editor, blockType]
  );

  const formatQuote = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (blockType === "quote") {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      }
    });
  }, [editor, blockType]);

  const formatCodeBlock = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (blockType === "code") {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createCodeNode());
        }
      }
    });
  }, [editor, blockType]);

  const formatParagraph = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  }, [editor]);

  const formatBulletList = useCallback(() => {
    if (blockType !== "bullet") {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      formatParagraph();
    }
  }, [editor, blockType, formatParagraph]);

  const formatNumberedList = useCallback(() => {
    if (blockType !== "number") {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      formatParagraph();
    }
  }, [editor, blockType, formatParagraph]);

  const insertHorizontalRule = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const hrNode = new HorizontalRuleNode();
        selection.insertNodes([hrNode]);
      }
    });
  }, [editor]);

  return (
    <div
      className={cn(
        "flex items-center justify-between px-2 py-1.5 border-b border-border bg-muted/30",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {/* Mode tabs on the left */}
      <Tabs
        value={mode}
        onValueChange={(value) => onModeChange(value as EditorMode)}
      >
        <TabsList className="h-7">
          <TabsTrigger value="rich" className="text-xs px-2.5 py-1">
            Rich Text
          </TabsTrigger>
          <TabsTrigger value="plain" className="text-xs px-2.5 py-1">
            Plain Text
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Formatting buttons on the right - only visible in rich text mode */}
      {mode === "rich" && (
        <div className="flex items-center gap-0.5">
          {/* Text formatting */}
          <ToolbarButton
            onClick={() => formatText("bold")}
            isActive={isBold}
            disabled={disabled}
            icon={Bold}
            tooltip="Bold"
            shortcut="⌘B"
          />
          <ToolbarButton
            onClick={() => formatText("italic")}
            isActive={isItalic}
            disabled={disabled}
            icon={Italic}
            tooltip="Italic"
            shortcut="⌘I"
          />
          <ToolbarButton
            onClick={() => formatText("strikethrough")}
            isActive={isStrikethrough}
            disabled={disabled}
            icon={Strikethrough}
            tooltip="Strikethrough"
          />
          <ToolbarButton
            onClick={() => formatText("code")}
            isActive={isCode}
            disabled={disabled}
            icon={Code}
            tooltip="Inline Code"
          />

          <ToolbarDivider />

          {/* Block formatting */}
          <ToolbarButton
            onClick={formatParagraph}
            isActive={blockType === "paragraph"}
            disabled={disabled}
            icon={Pilcrow}
            tooltip="Paragraph"
          />
          <ToolbarButton
            onClick={() => formatHeading("h1")}
            isActive={blockType === "h1"}
            disabled={disabled}
            icon={Heading1}
            tooltip="Heading 1"
          />
          <ToolbarButton
            onClick={() => formatHeading("h2")}
            isActive={blockType === "h2"}
            disabled={disabled}
            icon={Heading2}
            tooltip="Heading 2"
          />
          <ToolbarButton
            onClick={() => formatHeading("h3")}
            isActive={blockType === "h3"}
            disabled={disabled}
            icon={Heading3}
            tooltip="Heading 3"
          />

          <ToolbarDivider />

          {/* Lists and quote */}
          <ToolbarButton
            onClick={formatBulletList}
            isActive={blockType === "bullet"}
            disabled={disabled}
            icon={List}
            tooltip="Bullet List"
          />
          <ToolbarButton
            onClick={formatNumberedList}
            isActive={blockType === "number"}
            disabled={disabled}
            icon={ListOrdered}
            tooltip="Numbered List"
          />
          <ToolbarButton
            onClick={formatQuote}
            isActive={blockType === "quote"}
            disabled={disabled}
            icon={Quote}
            tooltip="Quote"
          />
          <ToolbarButton
            onClick={formatCodeBlock}
            isActive={blockType === "code"}
            disabled={disabled}
            icon={FileCode}
            tooltip="Code Block"
          />

          <ToolbarDivider />

          {/* Horizontal rule */}
          <ToolbarButton
            onClick={insertHorizontalRule}
            disabled={disabled}
            icon={Minus}
            tooltip="Horizontal Rule"
          />
        </div>
      )}
    </div>
  );
}

// Plugin to enable code syntax highlighting
function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerCodeHighlighting(editor);
  }, [editor]);

  return null;
}

// Plugin to prevent ⌘+Enter from inserting a new line (used for global save shortcut)
function PreventMetaEnterPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (event.metaKey && event.key === "Enter") {
          event.preventDefault();
          return true; // Prevent Lexical from handling this
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor]);

  return null;
}

// Plugin to sync value with editor state (Rich Text mode)
function RichTextValuePlugin({
  value,
  onChange,
  internalValueRef,
}: {
  value: string;
  onChange: (value: string) => void;
  internalValueRef: React.RefObject<string>;
}) {
  const [editor] = useLexicalComposerContext();
  // Track when we're syncing external value to prevent onChange firing
  const isSyncingRef = useRef(false);

  // Sync external value changes into the editor
  // This runs when value prop changes AND is different from what we last output
  useEffect(() => {
    // Skip if this is the value we just output (prevents cursor jumping)
    if (value === internalValueRef.current) {
      return;
    }

    // Mark that we're syncing to prevent onChange from firing
    isSyncingRef.current = true;

    // Update editor with new external value
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        if (value) {
          $convertFromMarkdownString(value, TRANSFORMERS, undefined, false);
        } else {
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode(""));
          root.append(paragraph);
        }
      },
      {
        // Use discrete update to batch the changes
        discrete: true,
      }
    );

    internalValueRef.current = value;

    // Reset sync flag after a tick to allow the update to complete
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [editor, value, internalValueRef]);

  // Handle editor changes - convert to markdown and notify parent
  const handleChange = useCallback(
    (editorState: EditorState) => {
      // Don't fire onChange when we're syncing external values
      if (isSyncingRef.current) {
        return;
      }

      editorState.read(() => {
        const markdown = $convertToMarkdownString(TRANSFORMERS);
        // Update ref BEFORE calling onChange to prevent sync loop
        internalValueRef.current = markdown;
        onChange(markdown);
      });
    },
    [onChange, internalValueRef]
  );

  return <OnChangePlugin onChange={handleChange} ignoreSelectionChange />;
}

// Plugin to sync value with editor state (Plain Text mode)
function PlainTextValuePlugin({
  value,
  onChange,
  internalValueRef,
}: {
  value: string;
  onChange: (value: string) => void;
  internalValueRef: React.RefObject<string>;
}) {
  const [editor] = useLexicalComposerContext();
  // Track when we're syncing external value to prevent onChange firing
  const isSyncingRef = useRef(false);

  // Sync external value changes into the editor
  useEffect(() => {
    // Skip if this is the value we just output (prevents cursor jumping)
    if (value === internalValueRef.current) {
      return;
    }

    // Mark that we're syncing to prevent onChange from firing
    isSyncingRef.current = true;

    // Update editor with new external value (as plain text)
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(value || ""));
        root.append(paragraph);
      },
      {
        discrete: true,
      }
    );

    internalValueRef.current = value;

    // Reset sync flag after a tick to allow the update to complete
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [editor, value, internalValueRef]);

  // Handle editor changes - get plain text and notify parent
  const handleChange = useCallback(
    (editorState: EditorState) => {
      // Don't fire onChange when we're syncing external values
      if (isSyncingRef.current) {
        return;
      }

      editorState.read(() => {
        const text = $getRoot().getTextContent();
        // Update ref BEFORE calling onChange to prevent sync loop
        internalValueRef.current = text;
        onChange(text);
      });
    },
    [onChange, internalValueRef]
  );

  return <OnChangePlugin onChange={handleChange} ignoreSelectionChange />;
}

export interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
}

export function PromptEditor({
  value,
  onChange,
  placeholder = "Enter your instructions...",
  className,
  minHeight = "400px",
  disabled = false,
}: PromptEditorProps) {
  const [mode, setMode] = useState<EditorMode>("rich");
  // Track what the editor last output to distinguish internal vs external changes
  const internalValueRef = useRef(value);

  // Handle mode change - reset the internal ref so the new editor will sync the value
  const handleModeChange = useCallback((newMode: EditorMode) => {
    // Reset the ref to force the new editor to sync the current value
    internalValueRef.current = "";
    setMode(newMode);
  }, []);

  // Rich text mode config with all nodes
  const richTextConfig = {
    namespace: "PromptEditor-Rich",
    theme,
    onError,
    nodes: editorNodes,
    editable: !disabled,
  };

  // Plain text mode config - minimal nodes
  const plainTextConfig = {
    namespace: "PromptEditor-Plain",
    theme: {
      root: "h-full",
      paragraph: "mb-0",
    },
    onError,
    nodes: [],
    editable: !disabled,
  };

  return (
    <div
      className={cn(
        "relative rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] overflow-hidden",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {/* Use key to force remount when mode changes */}
      <LexicalComposer
        key={mode}
        initialConfig={mode === "rich" ? richTextConfig : plainTextConfig}
      >
        <ToolbarPlugin
          disabled={disabled}
          mode={mode}
          onModeChange={handleModeChange}
        />
        <div className="relative">
          {mode === "rich" ? (
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className={cn(
                    "outline-none px-3 py-2 text-sm overflow-auto",
                    "prose prose-sm dark:prose-invert max-w-none",
                    "[&_ul]:my-1 [&_ol]:my-1"
                  )}
                  style={{ minHeight }}
                  aria-placeholder={placeholder}
                  placeholder={
                    <div
                      className="pointer-events-none absolute top-2 left-3 text-sm text-muted-foreground"
                      aria-hidden
                    >
                      {placeholder}
                    </div>
                  }
                />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          ) : (
            <PlainTextPlugin
              contentEditable={
                <ContentEditable
                  className={cn(
                    "outline-none px-3 py-2 text-sm overflow-auto whitespace-pre-wrap"
                  )}
                  style={{ minHeight }}
                  aria-placeholder={placeholder}
                  placeholder={
                    <div
                      className="pointer-events-none absolute top-2 left-3 text-sm text-muted-foreground"
                      aria-hidden
                    >
                      {placeholder}
                    </div>
                  }
                />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          )}
        </div>
        <HistoryPlugin />
        {mode === "rich" && (
          <>
            <ListPlugin />
            <CodeHighlightPlugin />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          </>
        )}
        <PreventMetaEnterPlugin />
        {mode === "rich" ? (
          <RichTextValuePlugin
            value={value}
            onChange={onChange}
            internalValueRef={internalValueRef}
          />
        ) : (
          <PlainTextValuePlugin
            value={value}
            onChange={onChange}
            internalValueRef={internalValueRef}
          />
        )}
      </LexicalComposer>
    </div>
  );
}
