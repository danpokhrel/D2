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

context.lineCap = "round"; // "square" "round" "butt"
context.lineWidth = penSize;

const lineList: lineSegment[][] = []; // A list of line segment lists
const redoList: lineSegment[][] = []; // Line segments that were removed by undone

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

canvas.addEventListener("mousedown", GetMouseData);
canvas.addEventListener("mouseup", (d) => {
  GetMouseData(d);
  if (newLine.length > 1) lineList.push(newLine.slice());
  newLine.splice(0);
  DrawLines();
  clearRedoList();
});

canvas.addEventListener("mousemove", (d) => {
  switch (mouse.clickType) {
    case ("L"):
      Draw(d);
      CreateLineSeg(d);
      break;

    case ("R"):
      console.log("Right click!");
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
  // console.log("Button pressed: " + data.buttons);
}

interface lineSegment {
  x: number;
  y: number;
  color: string;
  size: number;
}

const newLine: lineSegment[] = [];
function CreateLineSeg(data: MouseEvent) {
  if (mouse.clicked == true) {
    newLine.push({
      x: mouse.x,
      y: mouse.y,
      color: context.strokeStyle.toString(),
      size: penSize,
    });
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

  for (const line of lineList) {
    context.beginPath();
    context.moveTo(line[0].x, line[0].y);
    for (const { x, y } of line) {
      // console.log("\tCurrent Point:  (" + x + ", " + y + ")");
      context.lineTo(x, y);
    }
    context.strokeStyle = line[0].color;
    context.lineWidth = line[0].size;
    context.stroke();
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
  colorIndicator.textContent = "Current color: " + newColor;
  console.log("Changed color to " + newColor + " [" + penColor + "]");
}

const colorGroup = document.createElement("div");

const colorIndicator = document.createElement("p");
colorIndicator.textContent = "Current color:  black";

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
  UpdateSizeMeter();
}

const sizeGroup = document.createElement("div");

const sizePlusButt = document.createElement("button");
sizePlusButt.textContent = "+";
sizePlusButt.addEventListener("click", () => {
  SetPenSize(penSize + 1);
});

const sizeMinusButt = document.createElement("button");
sizeMinusButt.textContent = "-";
sizeMinusButt.addEventListener("click", () => {
  SetPenSize(penSize - 1);
});

// Thanks Babboy Had: https://bobbyhadz.com/blog/typescript-property-value-not-exist-type-htmlelement#use-a-type-assertion-to-solve-the-error
const sizeMeter = document.getElementById("penSize")! as HTMLInputElement;
sizeMeter.setAttribute("max", `${PEN_SIZE_MAX}`);
sizeMeter.setAttribute("min", `${PEN_SIZE_MIN}`);
sizeMeter.addEventListener("input", () => {
  SetPenSize(Number(sizeMeter.value));
});

console.log(sizeMeter.getAttributeNames());
console.log(sizeMeter.getAttribute("type"));

sizeGroup.append(sizeMinusButt, sizeMeter, sizePlusButt);

const sizeLabel = document.getElementById("sizeLabel")!;
sizeGroup.append(sizeLabel);

UpdateSizeMeter();

function UpdateSizeMeter() {
  sizeMeter.value = String(penSize);
  sizeLabel.textContent = ` [Pen size: ${penSize}] `;
}

toolsGroup.append(sizeGroup);

app.append(message, buttonGroup, toolsGroup, canvas);
