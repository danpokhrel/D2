const app = document.querySelector<HTMLElement>("#app")!;

const heading = document.createElement("h1");
heading.textContent = "D2 project";

const message = document.createElement("p");
message.textContent = "Click and drag to draw!";

const buttonGroup = document.createElement("div");

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

/*
 * A lot of this beginning structure was paraphrased from the QuantPaint assignment.
 * https://github.com/rndmcnlly/cmpm-121-f25-quaint-paint/blob/main/paint0.html
 * The code was not directly copied, but some of it's logic and structure was used as reference.
 */

const canvas = document.createElement("canvas");
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const context = canvas.getContext("2d")!;

context.lineWidth = 4;
context.lineCap = "round";

const lineList: lineSegment[][] = []; // A list of line segment lists
const redoPile: lineSegment[][] = [];

interface mouseData {
  x: number;
  y: number;
  clicked: boolean;
}
const mouse: mouseData = { x: 0, y: 0, clicked: false };

canvas.addEventListener("mousedown", GetMouseData);
canvas.addEventListener("mouseup", (d) => {
  GetMouseData(d);
  if (newLine.length > 1) lineList.push(newLine.slice());
  newLine.splice(0);
  DrawLines();
  redoPile.splice(0);
});

canvas.addEventListener("mousemove", (d) => {
  Draw(d);
  CreateLineSeg(d);
});
canvas.addEventListener("mouseenter", GetMouseData);

function GetMouseData(data: MouseEvent) {
  mouse.x = data.offsetX;
  mouse.y = data.offsetY;
  mouse.clicked = data.buttons == 1; // If left click specifically is pressed
  // console.log("Button pressed: " + data.buttons);
}

interface lineSegment {
  x: number;
  y: number;
}

const newLine: lineSegment[] = [];
function CreateLineSeg(data: MouseEvent) {
  if (mouse.clicked == true) {
    newLine.push({ x: mouse.x, y: mouse.y });
    GetMouseData(data);
  }
}

function Draw(data: MouseEvent) {
  if (mouse.clicked == true) {
    context.beginPath();
    context.moveTo(mouse.x, mouse.y);
    context.lineTo(data.offsetX, data.offsetY);
    context.stroke();
    // console.log(
    //   "mouse: (" + mouse.x + ", " + mouse.y + ") | data: (" + data.offsetX +
    //     ", " + data.offsetY + ")",
    // );
  }
  GetMouseData(data);
}

function DrawLines() {
  Clear();
  console.log(lineList);

  for (const line of lineList) {
    context.beginPath();
    context.moveTo(line[0].x, line[0].y);
    for (const { x, y } of line) {
      // console.log("\tCurrent Point:  (" + x + ", " + y + ")");
      context.lineTo(x, y);
    }
    context.stroke();
  }
}

function Clear() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function EraseAll() {
  Clear();
  redoPile.splice(0);
  for (const line of lineList) {
    redoPile.push(line);
  }
  lineList.splice(0);
}

function Undo() {
  const lastLine = lineList.pop();
  if (lastLine != undefined) {
    redoPile.push(lastLine);
  }
  DrawLines();
}

function Redo() {
  const lastLine = redoPile.pop();
  if (lastLine != undefined) {
    lineList.push(lastLine);
  }
  DrawLines();
}

const clearButt = document.createElement("button");
clearButt.textContent = "Erase All";
clearButt.addEventListener("click", EraseAll);
buttonGroup.append(clearButt);

const undoButt = document.createElement("button");
undoButt.textContent = "Undo";
undoButt.addEventListener("click", Undo);
buttonGroup.append(undoButt);

const redoButt = document.createElement("button");
redoButt.textContent = "Redo";
redoButt.addEventListener("click", Redo);
buttonGroup.append(redoButt);

app.append(heading, message, canvas, buttonGroup);
