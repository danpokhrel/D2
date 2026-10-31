const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 500;
const CANVAS_BG_COLOR = "hsl(0, 0%, 75%)";

const MOUSE_BUTTON_LIST = ["", "L", "R", "LR", "M", "LM", "MR", "LMR"];
const DRAW_BUTTON = MOUSE_BUTTON_LIST[1];
const STICKER_BUTTON = MOUSE_BUTTON_LIST[2];
const CURSOR_DRAW = "pointer";
const CURSOR_STICKER_ACTIVE = "grabbing";
const CURSOR_STICKER_INACTIVE = "grab";

const COLOR_DICT: Record<string, string> = {
  "black": "hsl(0, 0%, 0%)",
  "white": "hsl(0, 0%, 100%)",
  "red": "hsl(0, 50%, 50%)",
  "orange": "hsl(30, 50%, 50%)",
  "yellow": "hsl(60, 75%, 50%)",
  "green": "hsl(120, 50%, 50%)",
  "cyan": "hsl(180, 75%, 50%)",
  "blue": "hsl(230, 75%, 50%)",
  "purple": "hsl(260, 50%, 50%)",
  "pink": "hsl(300, 50%, 50%)",
};
const STICKER_LIST: string[] = CreateStickerList();

/*
 * A lot of this beginning structure was paraphrased from the QuantPaint assignment.
 * https://github.com/rndmcnlly/cmpm-121-f25-quaint-paint/blob/main/paint0.html
 * The code was not directly copied, but some of it's logic and structure was used as reference.
 */

const canvas = document.getElementById("mainCanvas")! as HTMLCanvasElement;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const context = canvas.getContext("2d")!;

const PEN_SIZE_MAX: number = 30;
const PEN_SIZE_MIN: number = 1;
const STICKER_SIZE_MAX = 120;
const STICKER_SIZE_MIN = 10;
const DEFAULT_BRUSH = "round";

context.lineCap = "round"; // "square" "round" "butt"

type CanvasElement = LineSegment | StickerElement;

interface MouseData {
  x: number;
  y: number;
  clicked: boolean;
  clickType: string;
}

const editor = {
  penColor: COLOR_DICT.black,
  penSize: 15,
  curSticker: 0,
  stickerSize: 30,
  brushName: DEFAULT_BRUSH,
  commandList: [] as CanvasElement[][],
  redoList: [] as CanvasElement[][],
  customBrushes: [] as { name: string; elements: CanvasElement[] }[],
  customCommands: new WeakSet<CanvasElement[]>(),
  mouse: { x: 0, y: 0, clicked: false, clickType: "" } as MouseData,
  addCommand(command: CanvasElement[]) {
    this.commandList.push(command);
    this.redoList.splice(0);
  },
  undo() {
    if (this.commandList.length > 0) {
      this.redoList.push(this.commandList.pop()!);
    }
  },
  redo() {
    if (this.redoList.length > 0) {
      this.commandList.push(this.redoList.pop()!);
    }
  },
  clear() {
    this.commandList.splice(0);
    this.redoList.splice(0);
  },
};
const newLine: LineSegment[] = [];
const newBrushCommand: CanvasElement[] = [];
context.lineWidth = editor.penSize;

function clamp(value: number, min: number, max: number) {
  if (max <= min) {
    throw new RangeError("max value should be larger than min!");
  }

  return (Math.max(min, Math.min(max, value)));
}

interface Tool {
  start(): void;
  move(data: MouseEvent): void;
  end(data: MouseEvent): void;
}

//https://coreui.io/blog/how-to-disable-right-click-on-a-website-using-javascript/
canvas.addEventListener("contextmenu", (d) => {
  d.preventDefault();
});

canvas.addEventListener("mousedown", (d) => {
  GetMouseData(d);
  GetActiveTool()?.start();
});
canvas.addEventListener("mouseup", (d) => {
  GetActiveTool()?.end(d);
});

canvas.addEventListener("mousemove", (d) => {
  GetActiveTool()?.move(d);
});
canvas.addEventListener("mouseenter", GetMouseData);

const tools: Record<string, Tool> = {
  [DRAW_BUTTON]: {
    start() {
      ChangeCursor(CURSOR_DRAW);
    },
    move(data) {
      Draw(data);
      CreateLineSeg(data);
    },
    end(data) {
      GetMouseData(data);
      if (newLine.length > 1) editor.addCommand(newLine.slice());
      newLine.splice(0);
      DrawLines();
    },
  },
  [STICKER_BUTTON]: {
    start() {
      ChangeCursor(CURSOR_STICKER_ACTIVE);
      PreviewSticker();
    },
    move(data) {
      GetMouseData(data);
      PreviewSticker();
    },
    end(data) {
      ChangeCursor(CURSOR_STICKER_INACTIVE);
      GetMouseData(data);
      CreateSticker();
      DrawLines();
    },
  },
};

const customBrushTool: Tool = {
  start() {
    ChangeCursor(CURSOR_DRAW);
    newBrushCommand.splice(0);
  },
  move(data) {
    if (editor.mouse.clicked) {
      AddCustomBrushStamp(editor.mouse.x, editor.mouse.y);
      DrawLines();
      RenderCommand(context, newBrushCommand, true);
    }
    GetMouseData(data);
  },
  end(data) {
    GetMouseData(data);
    if (newBrushCommand.length > 0) {
      const command = newBrushCommand.slice();
      editor.customCommands.add(command);
      editor.addCommand(command);
    }
    newBrushCommand.splice(0);
    DrawLines();
  },
};

function GetActiveTool(): Tool | undefined {
  if (
    editor.mouse.clickType == DRAW_BUTTON &&
    editor.brushName != DEFAULT_BRUSH
  ) {
    return customBrushTool;
  }
  return tools[editor.mouse.clickType];
}

function AddCustomBrushStamp(x: number, y: number) {
  const brush = editor.customBrushes.find((item) =>
    item.name == editor.brushName
  );
  if (!brush) return;

  for (const element of brush.elements) {
    if (element instanceof LineSegment) {
      newBrushCommand.push(
        new LineSegment(
          x + element.x,
          y + element.y,
          element.color,
          element.size,
        ),
      );
    } else {
      newBrushCommand.push(
        new StickerElement(
          x + element.x,
          y + element.y,
          element.img,
          element.size,
        ),
      );
    }
  }
}

function GetMouseData(data: MouseEvent) {
  editor.mouse.x = data.offsetX;
  editor.mouse.y = data.offsetY;
  editor.mouse.clicked = data.buttons != 0;
  editor.mouse.clickType = MOUSE_BUTTON_LIST[data.buttons] ?? "";
  /* L = 1
   * R = 2
   * L+R = 3
   * M = 4
   * L+M = 5
   * M+R = 6
   * L+M+R = 7
   */
}

function ChangeCursor(newCursor: string) {
  canvas.style.cursor = newCursor;
}

// https://www.reddit.com/r/typescript/comments/15n97m9/can_instanceof_operator_be_used_to_check_if_an/
class LineSegment {
  x: number;
  y: number;
  color: string;
  size: number;

  constructor(
    x: number,
    y: number,
    color: string = editor.penColor,
    size: number = 1,
  ) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
  }
}

function CreateLineSeg(data: MouseEvent) {
  if (editor.mouse.clicked == true) {
    newLine.push(
      new LineSegment(
        editor.mouse.x,
        editor.mouse.y,
        editor.penColor,
        editor.penSize,
      ),
    );
    GetMouseData(data);
  }
}

function Draw(data: MouseEvent) {
  if (editor.mouse.clicked == true) {
    context.beginPath();
    context.moveTo(editor.mouse.x, editor.mouse.y);
    context.lineTo(data.offsetX, data.offsetY);
    context.strokeStyle = editor.penColor;
    context.lineWidth = editor.penSize;
    context.stroke();
  }
  GetMouseData(data);
}

function DrawLines() {
  PrepareCanvas(context);
  RenderElements(context, 1);
}

function PrepareCanvas(
  target: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  scale = 1,
  fillBackground = false,
) {
  target.setTransform(1, 0, 0, 1, 0, 0);
  target.clearRect(0, 0, CANVAS_WIDTH * scale, CANVAS_HEIGHT * scale);
  if (fillBackground) {
    target.fillStyle = CANVAS_BG_COLOR;
    target.fillRect(0, 0, CANVAS_WIDTH * scale, CANVAS_HEIGHT * scale);
  }
}

function RenderElements(
  target: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  scale: number,
) {
  target.setTransform(scale, 0, 0, scale, 0, 0);
  target.lineCap = "round";
  for (const element of editor.commandList) {
    RenderCommand(target, element);
  }
}

function RenderCommand(
  target: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  element: CanvasElement[],
  isCustomBrush = editor.customCommands.has(element),
) {
  if (isCustomBrush) {
    for (const item of element) {
      if (item instanceof LineSegment) {
        target.beginPath();
        target.arc(item.x, item.y, item.size / 2, 0, Math.PI * 2);
        target.fillStyle = item.color;
        target.fill();
      } else {
        target.font = `${item.size}px serif`;
        target.fillText(item.img, item.x, item.y);
      }
    }
    return;
  }

  const first = element[0];
  if (!first) return;

  if (first instanceof LineSegment) {
    target.beginPath();
    target.moveTo(first.x, first.y);
    for (const { x, y } of element as LineSegment[]) {
      target.lineTo(x, y);
    }
    target.strokeStyle = first.color;
    target.lineWidth = first.size;
    target.stroke();
  } else if (first instanceof StickerElement) {
    for (const { x, y, img, size } of element as StickerElement[]) {
      target.font = `${size}px serif`;
      target.fillText(img, x, y);
    }
  }
}

function CloneBrushElements(): CanvasElement[] {
  const elements = editor.commandList.flatMap((command) =>
    command.map((element) => {
      if (element instanceof LineSegment) {
        return new LineSegment(
          element.x,
          element.y,
          element.color,
          element.size,
        );
      }
      return new StickerElement(
        element.x,
        element.y,
        element.img,
        element.size,
      );
    })
  );
  if (elements.length == 0) return elements;

  const xs = elements.map((element) => element.x);
  const ys = elements.map((element) => element.y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
  return elements.map((element) => {
    if (element instanceof LineSegment) {
      return new LineSegment(
        element.x - centerX,
        element.y - centerY,
        element.color,
        element.size,
      );
    }
    return new StickerElement(
      element.x - centerX,
      element.y - centerY,
      element.img,
      element.size,
    );
  });
}

const brushSelect = document.getElementById(
  "brushSelect",
)! as HTMLSelectElement;
const createBrushButt = document.getElementById(
  "createBrushButton",
)! as HTMLButtonElement;
brushSelect.addEventListener("change", () => {
  editor.brushName = brushSelect.value;
});
createBrushButt.addEventListener("click", CreateCustomBrush);

function CreateCustomBrush() {
  const name = prompt("Name your custom brush:")?.trim();
  if (
    !name ||
    name == DEFAULT_BRUSH ||
    editor.customBrushes.some((brush) => brush.name == name)
  ) return;

  const elements = CloneBrushElements();
  if (elements.length == 0) return;

  editor.customBrushes.push({ name, elements });
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name;
  brushSelect.append(option);
  brushSelect.value = name;
  editor.brushName = name;
  editor.clear();
  DrawLines();
}

const clearButt = document.getElementById("clearButton")! as HTMLButtonElement;
clearButt.textContent = "Erase All";
clearButt.addEventListener("click", EraseScreen);

const exportButt = document.getElementById(
  "exportButton",
)! as HTMLButtonElement;
exportButt.addEventListener("click", ExportHighResolution);

async function ExportHighResolution() {
  const scale = 2;
  const exportCanvas = new OffscreenCanvas(
    CANVAS_WIDTH * scale,
    CANVAS_HEIGHT * scale,
  );
  const exportContext = exportCanvas.getContext("2d");
  if (!exportContext) {
    throw new Error("Unable to create export canvas context.");
  }

  PrepareCanvas(exportContext, scale, true);
  RenderElements(exportContext, scale);
  const blob = await exportCanvas.convertToBlob({ type: "image/png" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "drawing.png";
  link.click();
  URL.revokeObjectURL(link.href);
}

const undoButt = document.getElementById("undoButton")! as HTMLButtonElement;
undoButt.textContent = "Undo";
undoButt.addEventListener("click", Undo);

const redoButt = document.getElementById("redoButton")! as HTMLButtonElement;
redoButt.textContent = "Redo";
redoButt.addEventListener("click", Redo);

function Redo() {
  editor.redo();
  DrawLines();
}

function Undo() {
  editor.undo();
  DrawLines();
}

// This one just clears the screen visually so it can be re-drawn
function ClearScreen() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

// This one actualy clears the line list and redo history to get rid of everything
function EraseScreen() {
  ClearScreen();
  editor.clear();
}

// ------------------ Pen Color Section ------------------

// https://www.totaltypescript.com/concepts/type-string-cannot-be-used-to-index-type#solution-1-tighten-the-index
function ChangeColor(newColor: keyof typeof COLOR_DICT) {
  editor.penColor = COLOR_DICT[newColor];
  UpdateColorIndication(newColor);
  console.log("Changed color to " + newColor + " [" + editor.penColor + "]");
}

function UpdateColorIndication(colorName: string) {
  colorIndicator.textContent = "Current color: " + colorName;
}

const colorGroup = document.getElementById("colorButtons")!;

const colorIndicator = document.getElementById("colorLabel")!;
UpdateColorIndication("black");

colorGroup.append(colorIndicator);
for (const color in COLOR_DICT) {
  const colorButt = document.createElement("button");
  colorButt.textContent = "Change color: " + color;
  colorButt.addEventListener("click", () => {
    ChangeColor(color);
  });

  colorButt.style.backgroundColor = COLOR_DICT[color];
  if (["white", "yellow", "brown"].includes(color)) {
    colorButt.style.color = COLOR_DICT["black"];
  } else {
    colorButt.style.color = COLOR_DICT["white"];
  }

  colorGroup.append(colorButt);
}

// ------------------ Pen Size Section ------------------

function SetPenSize(newSize: number, useLimits: boolean = true) {
  if (useLimits == true) {
    newSize = clamp(newSize, PEN_SIZE_MIN, PEN_SIZE_MAX);
  }

  editor.penSize = newSize;
  UpdateSizeIndication();
}

const sizeGroup = document.getElementById("penSizeButtons")!;

const penSizePlusButt = document.getElementById(
  "penSizePlus",
)! as HTMLButtonElement;
penSizePlusButt.textContent = "+";
penSizePlusButt.addEventListener("click", () => {
  SetPenSize(editor.penSize + 1);
});

const penSizeMinusButt = document.getElementById(
  "penSizeMinus",
)! as HTMLButtonElement;
penSizeMinusButt.textContent = "-";
penSizeMinusButt.addEventListener("click", () => {
  SetPenSize(editor.penSize - 1);
});

// Thanks Babboy Had: https://bobbyhadz.com/blog/typescript-property-value-not-exist-type-htmlelement#use-a-type-assertion-to-solve-the-error
const sizeMeter = document.getElementById("penSizeSlider")! as HTMLInputElement;
sizeMeter.setAttribute("max", `${PEN_SIZE_MAX}`);
sizeMeter.setAttribute("min", `${PEN_SIZE_MIN}`);
sizeMeter.addEventListener("input", () => {
  SetPenSize(Number(sizeMeter.value));
});

sizeGroup.append(penSizeMinusButt, sizeMeter, penSizePlusButt);

const penSizeLabel = document.getElementById("penSizeLabel")!;
sizeGroup.append(penSizeLabel);

UpdateSizeIndication();

function UpdateSizeIndication() {
  sizeMeter.value = String(editor.penSize);
  penSizeLabel.textContent = ` [Pen size: ${editor.penSize}] `;
}

// ------------------ Sticker Section ------------------

const stickerGroup = document.getElementById("stickerButtons")!;

function CreateStickerList(): string[] {
  const list: string[] = [];

  // String.fromCodePoint() was inspired by [this](view-source:https://www.base64.sh/js-unicode/) at line 593
  for (let i = 0x1F600; i < 0x1F6FD; i++) {
    // console.log(`\ti : ${i} : ${String.fromCodePoint(i)}`);
    list.push(String.fromCodePoint(i));
  }
  return list;
}

class StickerElement {
  x: number;
  y: number;
  img: string;
  size: number;

  constructor(
    x: number,
    y: number,
    img: string = STICKER_LIST[editor.curSticker],
    size: number = 1,
  ) {
    this.x = x;
    this.y = y;
    this.img = img;
    this.size = size;
  }
}

function GetSticker(index: number = editor.curSticker): string {
  return (STICKER_LIST[index]);
}

function CreateSticker() {
  const newSticker: StickerElement[] = [];
  newSticker.push(
    new StickerElement(
      editor.mouse.x - editor.stickerSize / 2,
      editor.mouse.y + editor.stickerSize / 2,
      GetSticker(),
      editor.stickerSize,
    ),
  );
  editor.addCommand(newSticker);
}

function PreviewSticker() {
  DrawLines();
  context.font = `${editor.stickerSize}px serif`;
  context.fillText(
    GetSticker(),
    editor.mouse.x - editor.stickerSize / 2,
    editor.mouse.y + editor.stickerSize / 2,
  );
}

const stickerPlusButt = document.getElementById(
  "stickerSelectNext",
)! as HTMLButtonElement;
stickerPlusButt.textContent = ">";
stickerPlusButt.addEventListener("click", SelectNextsticker);

function SelectNextsticker() {
  editor.curSticker++;
  if (editor.curSticker >= STICKER_LIST.length) editor.curSticker = 0;
  UpdateStickerIndication();
}

const stickerMinusButt = document.getElementById(
  "stickerSelectPrev",
)! as HTMLButtonElement;
stickerMinusButt.textContent = "<";
stickerMinusButt.addEventListener("click", SelectPrevsticker);

function SelectPrevsticker() {
  editor.curSticker--;
  if (editor.curSticker < 0) editor.curSticker = STICKER_LIST.length - 1;
  UpdateStickerIndication();
}

const stickerLabel = document.getElementById("stickerSelectLabel")!;
stickerLabel.textContent = GetSticker();

// deno-lint-ignore no-unused-vars
function SelectSticker(index: number) {
  editor.curSticker = clamp(index, 0, STICKER_LIST.length - 1);
  UpdateStickerIndication();
}

// Thanks Babboy Had: https://bobbyhadz.com/blog/typescript-property-value-not-exist-type-htmlelement#use-a-type-assertion-to-solve-the-error
const stickerSizeMeter = document.getElementById(
  "stickerSizeSlider",
)! as HTMLInputElement;
stickerSizeMeter.setAttribute("max", `${STICKER_SIZE_MAX}`);
stickerSizeMeter.setAttribute("min", `${STICKER_SIZE_MIN}`);
stickerSizeMeter.addEventListener("input", () => {
  SetStickerSize(Number(stickerSizeMeter.value));
  UpdateStickerIndication();
});

const stickerSizePlusButt = document.getElementById(
  "stickerSizePlus",
)! as HTMLButtonElement;
stickerSizePlusButt.textContent = "+";
stickerSizePlusButt.addEventListener("click", () => {
  SetStickerSize(editor.stickerSize + 1);
});

const stickerSizeMinusButt = document.getElementById(
  "stickerSizeMinus",
)! as HTMLButtonElement;
stickerSizeMinusButt.textContent = "-";
stickerSizeMinusButt.addEventListener("click", () => {
  SetStickerSize(editor.stickerSize - 1);
});

const stickerSizeLabel = document.getElementById("stickerSizeLabel")!;
stickerGroup.append(
  stickerSizeMinusButt,
  stickerSizeMeter,
  stickerSizePlusButt,
  stickerSizeLabel,
);

function SetStickerSize(newSize: number, useLimits: boolean = true) {
  if (useLimits == true) {
    newSize = clamp(newSize, STICKER_SIZE_MIN, STICKER_SIZE_MAX);
  }

  editor.stickerSize = newSize;
  UpdateStickerIndication();
}

function UpdateStickerIndication() {
  stickerSizeMeter.value = String(editor.stickerSize);
  stickerSizeLabel.textContent = ` [Sticker Size: ${editor.stickerSize}] `;

  stickerLabel.textContent = GetSticker();
}
UpdateStickerIndication();
