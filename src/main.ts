const app = document.querySelector<HTMLElement>("#app")!;

// const heading = document.createElement("h1");
// heading.textContent = "D2 project";

const message = document.createElement("p");
message.textContent = "Click and drag to draw!";

const buttonGroup = document.createElement("div");

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 500;
const _CANVAS_BG_COLOR = "hsl(0, 0%, 75%)";

const MOUSE_BUTTON_LIST = ["", "L", "R", "LR", "M", "LM", "MR", "LMR"];
const DRAW_BUTTON = MOUSE_BUTTON_LIST[1];
const STICKER_BUTTON = MOUSE_BUTTON_LIST[2];

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

const canvas = document.createElement("canvas");
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const context = canvas.getContext("2d")!;

// Pen Settings
let penColor: string = COLOR_DICT.black;
let penSize: number = 15;
const PEN_SIZE_MAX: number = 30;
const PEN_SIZE_MIN: number = 1;
// deno-lint-ignore prefer-const
let _penShape: string = "circle";

let curSticker: number = 0;
let stickerSize: number = 30;
const STICKER_SIZE_MAX = 120;
const STICKER_SIZE_MIN = 10;

context.lineCap = "round"; // "square" "round" "butt"
context.lineWidth = penSize;

type canvasElement = lineSegment | stickerElement;

const lineList: canvasElement[][] = []; // A list of canvasElement lists
const redoList: canvasElement[][] = []; // Line segments that were removed by undone

interface mouseData {
  x: number;
  y: number;
  clicked: boolean;
  clickType: string;
}
const mouse: mouseData = { x: 0, y: 0, clicked: false, clickType: "" };

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
    case STICKER_BUTTON:
      console.log("Right click!");
      break;

    default:
      break;
  }
});
canvas.addEventListener("mouseup", (d) => {
  switch (mouse.clickType) {
    case DRAW_BUTTON:
      GetMouseData(d);
      if (newLine.length > 1) lineList.push(newLine.slice());
      newLine.splice(0);
      DrawLines();
      clearRedoList();
      break;

    case STICKER_BUTTON:
      console.log("Right click released!");
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
      console.log("Right click move!");
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
  mouse.clickType = MOUSE_BUTTON_LIST[data.buttons];
  /* L = 1
   * R = 2
   * L+R = 3
   * M = 4
   * L+M = 5
   * M+R = 6
   * L+M+R = 7
   */
  // mouse.scrollDelta =
  // console.log("Button pressed: " + data.buttons);
}

// interface lineSegment {
//   x: number;
//   y: number;
//   color: string;
//   size: number;
// }
// https://www.reddit.com/r/typescript/comments/15n97m9/can_instanceof_operator_be_used_to_check_if_an/
class lineSegment {
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

const newLine: lineSegment[] = [];
function CreateLineSeg(data: MouseEvent) {
  if (mouse.clicked == true) {
    newLine.push(
      new lineSegment(
        mouse.x,
        mouse.y,
        context.strokeStyle.toString(),
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
    // console.log(
    //   "mouse: (" + mouse.x + ", " + mouse.y + ") | data: (" + data.offsetX +
    //     ", " + data.offsetY + ")",
    // );
  }
  GetMouseData(data);
}

function DrawLines() {
  ClearScreen();
  console.log(lineList);

  for (const element of lineList) {
    if (element[0] instanceof lineSegment) {
      context.beginPath();
      context.moveTo(element[0].x, element[0].y);
      for (const { x, y } of element as lineSegment[]) {
        // console.log("\tCurrent Point:  (" + x + ", " + y + ")");
        context.lineTo(x, y);
      }
      context.strokeStyle = element[0].color;
      context.lineWidth = element[0].size;
      context.stroke();
    } else if (element[0] instanceof stickerElement) {
      for (const { x, y, img, size } of element as stickerElement[]) {
        context.font = `${size}px serif`;
        context.fillText(img, x, y);
      }
    }
  }
}

const clearButt = document.createElement("button");
clearButt.textContent = "Erase All";
clearButt.addEventListener("click", EraseScreen);
buttonGroup.append(clearButt);

const undoButt = document.createElement("button");
undoButt.textContent = "Undo";
undoButt.addEventListener("click", Undo);
buttonGroup.append(undoButt);

const redoButt = document.createElement("button");
redoButt.textContent = "Redo";
redoButt.addEventListener("click", Redo);
buttonGroup.append(redoButt);

function Redo() {
  if (redoList.length > 0) {
    lineList.push(redoList.pop()!);
    DrawLines();
  }
}

function Undo() {
  if (lineList.length > 0) {
    redoList.push(lineList.pop()!);
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
  // for (const line of lineList) {
  //   redoList.push(line);
  // }
  lineList.splice(0);
}

const toolsGroup = document.createElement("div");

// Pen Color Section

// https://www.totaltypescript.com/concepts/type-string-cannot-be-used-to-index-type#solution-1-tighten-the-index
function ChangeColor(newColor: keyof typeof COLOR_DICT) {
  if (COLOR_DICT[newColor] == undefined) {
    console.warn(
      'ChangeColor(): "' + newColor +
        '" is not in the COLOR_DICT.\nCOLOR_DICT: ' + COLOR_DICT,
    );

    return;
  }

  penColor = COLOR_DICT[newColor];
  UpdateColorInidication(newColor);
  console.log("Changed color to " + newColor + " [" + penColor + "]");
}

function UpdateColorInidication(colorName: string) {
  colorIndicator.textContent = "Current color: " + colorName;
}

const colorGroup = document.createElement("div");

const colorIndicator = document.createElement("p");
UpdateColorInidication("black");

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

toolsGroup.append(colorGroup);

// Pen Size Section
function SetPenSize(newSize: number, constrained: boolean = true) {
  if (constrained == true) {
    newSize = clamp(newSize, PEN_SIZE_MIN, PEN_SIZE_MAX);
  }

  penSize = newSize;
  UpdateSizeIndication();
}

const sizeGroup = document.createElement("div");

const penSizePlusButt = document.createElement("button");
penSizePlusButt.textContent = "+";
penSizePlusButt.addEventListener("click", () => {
  SetPenSize(penSize + 1);
});

const penSizeMinusButt = document.createElement("button");
penSizeMinusButt.textContent = "-";
penSizeMinusButt.addEventListener("click", () => {
  SetPenSize(penSize - 1);
});

// Thanks Babboy Had: https://bobbyhadz.com/blog/typescript-property-value-not-exist-type-htmlelement#use-a-type-assertion-to-solve-the-error
const sizeMeter = document.getElementById("penSize")! as HTMLInputElement;
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

toolsGroup.append(sizeGroup);

// Sticker Section
const stickerGroup = document.createElement("div");

function CreateStickerList(): string[] {
  const list: string[] = [];

  // String.fromCodePoint() was discovered [here](view-source:https://www.base64.sh/js-unicode/) at line 593
  for (let i = 0x1F600; i < 0x1F6FD; i++) {
    // console.log(`\ti : ${i} : ${String.fromCodePoint(i)}`);
    list.push(String.fromCodePoint(i));
  }
  return list;
}

class stickerElement {
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
  const newSticker: stickerElement[] = [];
  newSticker.push(
    new stickerElement(
      mouse.x - stickerSize / 2,
      mouse.y + stickerSize / 2,
      GetSticker(),
      stickerSize,
    ),
  );
  lineList.push(newSticker);
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

const stickerPlusButt = document.createElement("button");
stickerPlusButt.textContent = ">";
stickerPlusButt.addEventListener("click", SelectNextsticker);

function SelectNextsticker() {
  curSticker++;
  if (curSticker >= STICKER_LIST.length) curSticker = 0;
  UpdateStickerIndication();
}

const stickerMinusButt = document.createElement("button");
stickerMinusButt.textContent = "<";
stickerMinusButt.addEventListener("click", SelectPrevsticker);

function SelectPrevsticker() {
  curSticker--;
  if (curSticker < 0) curSticker = STICKER_LIST.length - 1;
  UpdateStickerIndication();
}

const stickerLabel = document.createElement("text");
stickerLabel.textContent = GetSticker();

stickerGroup.append(stickerMinusButt, stickerLabel, stickerPlusButt);

// deno-lint-ignore no-unused-vars
function SelectSticker(index: number) {
  curSticker = clamp(index, 0, STICKER_LIST.length - 1);
  UpdateStickerIndication();
}

// Thanks Babboy Had: https://bobbyhadz.com/blog/typescript-property-value-not-exist-type-htmlelement#use-a-type-assertion-to-solve-the-error
const stickerSizeMeter = document.getElementById(
  "stickerSize",
)! as HTMLInputElement;
stickerSizeMeter.setAttribute("max", `${STICKER_SIZE_MAX}`);
stickerSizeMeter.setAttribute("min", `${STICKER_SIZE_MIN}`);
stickerSizeMeter.addEventListener("input", () => {
  SetStickerSize(Number(stickerSizeMeter.value));
  UpdateStickerIndication();
});

const stickerSizePlusButt = document.createElement("button");
stickerSizePlusButt.textContent = "+";
stickerSizePlusButt.addEventListener("click", () => {
  SetStickerSize(stickerSize + 1);
});

const stickerSizeMinusButt = document.createElement("button");
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

toolsGroup.append(stickerGroup);

app.append(message, buttonGroup, toolsGroup, canvas);
