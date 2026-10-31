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

// Pen Settings
let penColor: string = COLOR_DICT.black;
let penSize: number = 15;
const PEN_SIZE_MAX: number = 30;
const PEN_SIZE_MIN: number = 1;

let curSticker: number = 0;
let stickerSize: number = 30;
const STICKER_SIZE_MAX = 120;
const STICKER_SIZE_MIN = 10;

context.lineCap = "round"; // "square" "round" "butt"
context.lineWidth = penSize;

type CanvasElement = LineSegment | StickerElement;

const commandList: CanvasElement[][] = []; // A list of canvasElement lists
const redoList: CanvasElement[][] = []; // Line segments that were removed by undone

interface MouseData {
  x: number;
  y: number;
  clicked: boolean;
  clickType: string;
}
const mouse: MouseData = { x: 0, y: 0, clicked: false, clickType: "" };

function clamp(value: number, min: number, max: number) {
  if (max <= min) {
    throw new RangeError("max value should be larger than min!");
  }

  return (Math.max(min, Math.min(max, value)));
}

//https://coreui.io/blog/how-to-disable-right-click-on-a-website-using-javascript/
canvas.addEventListener("contextmenu", (d) => {
  d.preventDefault();
});

canvas.addEventListener("mousedown", (d) => {
  GetMouseData(d);

  switch (mouse.clickType) {
    case DRAW_BUTTON:
      ChangeCursor(CURSOR_DRAW);
      break;
    case STICKER_BUTTON:
      ChangeCursor(CURSOR_STICKER_ACTIVE);
      PreviewSticker();
      break;
  }
});
canvas.addEventListener("mouseup", (d) => {
  switch (mouse.clickType) {
    case DRAW_BUTTON:
      GetMouseData(d);
      if (newLine.length > 1) commandList.push(newLine.slice());
      newLine.splice(0);
      DrawLines();
      clearRedoList();
      break;

    case STICKER_BUTTON:
      ChangeCursor(CURSOR_STICKER_INACTIVE);
      GetMouseData(d);
      CreateSticker();
      DrawLines();
      clearRedoList();
      break;

    default:
      break;
  }
});

canvas.addEventListener("mousemove", (d) => {
  switch (mouse.clickType) {
    case DRAW_BUTTON:
      Draw(d);
      CreateLineSeg(d);
      break;

    case STICKER_BUTTON:
      GetMouseData(d);
      PreviewSticker();
      break;

    default:
      break;
  }
});
canvas.addEventListener("mouseenter", GetMouseData);

function GetMouseData(data: MouseEvent) {
  mouse.x = data.offsetX;
  mouse.y = data.offsetY;
  mouse.clicked = data.buttons != 0;
  mouse.clickType = MOUSE_BUTTON_LIST[data.buttons] ?? "";
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
    color: string = penColor,
    size: number = 1,
  ) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
  }
}

const newLine: LineSegment[] = [];
function CreateLineSeg(data: MouseEvent) {
  if (mouse.clicked == true) {
    newLine.push(
      new LineSegment(
        mouse.x,
        mouse.y,
        penColor,
        penSize,
      ),
    );
    GetMouseData(data);
  }
}

function Draw(data: MouseEvent) {
  if (mouse.clicked == true) {
    context.beginPath();
    context.moveTo(mouse.x, mouse.y);
    context.lineTo(data.offsetX, data.offsetY);
    context.strokeStyle = penColor;
    context.lineWidth = penSize;
    context.stroke();
  }
  GetMouseData(data);
}

function DrawLines() {
  DrawElements(context, 1, false);
}

function DrawElements(
  target: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  scale: number,
  fillBackground: boolean,
) {
  target.setTransform(scale, 0, 0, scale, 0, 0);
  target.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if (fillBackground) {
    target.fillStyle = CANVAS_BG_COLOR;
    target.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
  target.lineCap = "round";
  for (const element of commandList) {
    const first = element[0];
    if (!first) continue;

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

  DrawElements(exportContext, scale, true);
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
  if (redoList.length > 0) {
    commandList.push(redoList.pop()!);
    DrawLines();
  }
}

function Undo() {
  if (commandList.length > 0) {
    redoList.push(commandList.pop()!);
    DrawLines();
  }
}

function clearRedoList() {
  redoList.splice(0);
}

// This one just clears the screen visually so it can be re-drawn
function ClearScreen() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

// This one actualy clears the line list and redo history to get rid of everything
function EraseScreen() {
  ClearScreen();
  clearRedoList();

  commandList.splice(0);
}

// ------------------ Pen Color Section ------------------

// https://www.totaltypescript.com/concepts/type-string-cannot-be-used-to-index-type#solution-1-tighten-the-index
function ChangeColor(newColor: keyof typeof COLOR_DICT) {
  penColor = COLOR_DICT[newColor];
  UpdateColorIndication(newColor);
  console.log("Changed color to " + newColor + " [" + penColor + "]");
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

  penSize = newSize;
  UpdateSizeIndication();
}

const sizeGroup = document.getElementById("penSizeButtons")!;

const penSizePlusButt = document.getElementById(
  "penSizePlus",
)! as HTMLButtonElement;
penSizePlusButt.textContent = "+";
penSizePlusButt.addEventListener("click", () => {
  SetPenSize(penSize + 1);
});

const penSizeMinusButt = document.getElementById(
  "penSizeMinus",
)! as HTMLButtonElement;
penSizeMinusButt.textContent = "-";
penSizeMinusButt.addEventListener("click", () => {
  SetPenSize(penSize - 1);
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
  sizeMeter.value = String(penSize);
  penSizeLabel.textContent = ` [Pen size: ${penSize}] `;
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
    img: string = STICKER_LIST[curSticker],
    size: number = 1,
  ) {
    this.x = x;
    this.y = y;
    this.img = img;
    this.size = size;
  }
}

function GetSticker(index: number = curSticker): string {
  return (STICKER_LIST[index]);
}

function CreateSticker() {
  const newSticker: StickerElement[] = [];
  newSticker.push(
    new StickerElement(
      mouse.x - stickerSize / 2,
      mouse.y + stickerSize / 2,
      GetSticker(),
      stickerSize,
    ),
  );
  commandList.push(newSticker);
}

function PreviewSticker() {
  DrawLines();
  context.font = `${stickerSize}px serif`;
  context.fillText(
    GetSticker(),
    mouse.x - stickerSize / 2,
    mouse.y + stickerSize / 2,
  );
}

const stickerPlusButt = document.getElementById(
  "stickerSelectNext",
)! as HTMLButtonElement;
stickerPlusButt.textContent = ">";
stickerPlusButt.addEventListener("click", SelectNextsticker);

function SelectNextsticker() {
  curSticker++;
  if (curSticker >= STICKER_LIST.length) curSticker = 0;
  UpdateStickerIndication();
}

const stickerMinusButt = document.getElementById(
  "stickerSelectPrev",
)! as HTMLButtonElement;
stickerMinusButt.textContent = "<";
stickerMinusButt.addEventListener("click", SelectPrevsticker);

function SelectPrevsticker() {
  curSticker--;
  if (curSticker < 0) curSticker = STICKER_LIST.length - 1;
  UpdateStickerIndication();
}

const stickerLabel = document.getElementById("stickerSelectLabel")!;
stickerLabel.textContent = GetSticker();

// deno-lint-ignore no-unused-vars
function SelectSticker(index: number) {
  curSticker = clamp(index, 0, STICKER_LIST.length - 1);
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
  SetStickerSize(stickerSize + 1);
});

const stickerSizeMinusButt = document.getElementById(
  "stickerSizeMinus",
)! as HTMLButtonElement;
stickerSizeMinusButt.textContent = "-";
stickerSizeMinusButt.addEventListener("click", () => {
  SetStickerSize(stickerSize - 1);
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

  stickerSize = newSize;
  UpdateStickerIndication();
}

function UpdateStickerIndication() {
  stickerSizeMeter.value = String(stickerSize);
  stickerSizeLabel.textContent = ` [Sticker Size: ${stickerSize}] `;

  stickerLabel.textContent = GetSticker();
}
UpdateStickerIndication();
