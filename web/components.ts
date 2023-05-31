import { Canvas, Component } from './blackbeard.js';

export enum Color {
  Movable,
  Other,
}

export let color_table: { [color_name: string]: string } = {
  "movable": "#0b8c4d",
  "other": "#9cc1bf",
  "selected": "#ffff00",
  "goal": "#1c28af",
  "text_primary": "#000000",
  "text_hover": "#6d6d6d",
  "modal_background": "#ffffff",
  "modal_behind": "rgba(38, 38, 38, 0.5)",
  "modal_border": "#6b6b6b",
};

export namespace Color {
  export function to_hex(color: Color): string {
    let hex: string;
    switch (color) {
      case Color.Movable:
        hex = color_table["movable"];
        break;
      case Color.Other:
        hex = color_table["other"];
        break;
    }
    return hex;
  }
}

export type ChangeColorCustomEvent = { detail: { location: number[], new_color: Color, suppress?: boolean } };

export type TextChangeCustomEvent = { detail: { id: string, new_add: string } };

interface Clickable {
  click_disabled: boolean;
  click: (e: MouseEvent) => void;
}

namespace Clickable {
  export function is_clickable(obj: any): obj is Clickable {
    return typeof obj.click_disabled === "boolean" && typeof obj.click === "function";
  }
}

export class Tile implements Component, Clickable {
  canvas: Canvas;
  context: CanvasRenderingContext2D;
  readonly location: number[];
  color: Color;
  readonly goal: boolean;
  top_left: number[];
  size: number;
  spacing: number;
  selected: boolean;
  suppress: boolean;
  hovered: boolean;
  click_disabled: boolean;

  readonly type: string = "tile";

  constructor(canvas: Canvas, location: number[], color: Color, goal: boolean = false, top_left: number[], size: number, spacing: number) {
    this.canvas = canvas;
    this.context = this.canvas.context;
    //location of tile [x, y]
    this.location = location;
    //color of tile
    this.color = color;
    //whether a movable tile should be here or not
    this.goal = goal;
    //top left coordinates for the entire tile grid
    this.top_left = top_left;
    //the size (height and width) of the tile
    this.size = size;
    //spacing between tiles
    this.spacing = spacing;
    //tile selected
    this.selected = false;
    //hide true color if true (internally be marked as movable but display as blank)
    this.suppress = false;
    //true if user is hovering over
    this.hovered = false;
    //ignore clicks if true
    this.click_disabled = false;
    //register events
    this.canvas.addEvent("click", [this], false);
    this.canvas.addEvent("mousemove", [this], false);
    this.canvas.addEvent("custom_change_color", [this], false);
    //add to components
    this.canvas.components.push(this);
  }
  update() {
    if (this.color !== Color.Movable && this.selected) {
      this.selected = false;
    }
    let x: number = this.top_left[0]+this.location[0]*(this.size+this.spacing);
    let y: number = this.top_left[1]+this.location[1]*(this.size+this.spacing);
    let path = new Path2D();
    path.rect(x, y, this.size, this.size);
    this.context.fillStyle = Color.to_hex(this.color);
    if (this.suppress) {
      this.context.fillStyle = Color.to_hex(Color.Other);
    }
    this.context.fill(path);
    if (this.selected) {
      this.context.lineWidth = 2;
      this.context.strokeStyle = color_table["selected"];
      this.context.stroke(path);
    } else if (this.goal) {
      this.context.lineWidth = 2;
      this.context.strokeStyle = color_table["goal"];
      this.context.stroke(path);
    }
  }
  static within_bounds(tile: Tile, e: MouseEvent) {
    let x1: number = tile.top_left[0]+tile.location[0]*(tile.size+tile.spacing);
    let y1: number = tile.top_left[1]+tile.location[1]*(tile.size+tile.spacing);
    let x2: number = x1+tile.size;
    let y2: number = y1+tile.size;
    //check to make sure click is within tile
    if (e.offsetX < x1 || e.offsetX > x2 || e.offsetY < y1 || e.offsetY > y2) {
      return false;
    } else {
      return true;
    }
  }
  click(e: MouseEvent) {
    if (this.click_disabled) return;
    //check to make sure click is within tile
    if (!Tile.within_bounds(this, e)) {
      this.selected = false;
      return;
    }
    if (this.color !== Color.Movable) return;
    this.selected = true;
  }
  mousemove(e: MouseEvent) {
    //check to make sure it is within bounds, and click is enabled
    if (this.click_disabled || !Tile.within_bounds(this, e) || this.color !== Color.Movable) {
      if (this.hovered) {
        this.hovered = false;
        this.canvas.canvas.style.cursor = "default";
      }
      return;
    }
    //set cursor and hover
    this.canvas.canvas.style.cursor = "pointer";
    this.hovered = true;
  }
  custom_change_color(e: ChangeColorCustomEvent) {
    if (this.location[0] !== e.detail.location[0] || this.location[1] !== e.detail.location[1]) return;
    this.color = e.detail.new_color;
    if (e.detail.suppress) {
      this.suppress = true;
    } else {
      this.suppress = false;
    }
  }
}

//directions that tiles can move
export enum Direction {
  Up,
  Down,
  Left,
  Right,
}

export namespace Direction {
  export function random_direction(): Direction {
    return [Direction.Up, Direction.Down, Direction.Left, Direction.Right][Math.floor(Math.random()*4)];
  }
  export function is_vertical(direction: Direction): boolean {
    return direction === Direction.Up || direction === Direction.Down;
  }
  export function is_horizontal(direction: Direction): boolean {
    return direction === Direction.Left || direction === Direction.Right;
  }
  export function next_direction(direction: Direction): Direction {
    if (direction === Direction.Up) {
      return Direction.Down;
    } else if (direction === Direction.Down) {
      return Direction.Left; 
    } else if (direction === Direction.Left) {
      return Direction.Right; 
    } else if (direction === Direction.Right) {
      return Direction.Up; 
    }
  }
}

//the sliding tile animation thing
export class SlidingTile implements Component {
  canvas: Canvas;
  context: CanvasRenderingContext2D;
  readonly direction: Direction;
  readonly constant: number;
  readonly start: number;
  readonly end: number;
  top_left: number[];
  size: number;
  side_length: number;
  spacing: number;
  end_func: () => void | undefined;
  start_frame: number;

  readonly type: string = "sliding-tile";

  constructor(canvas: Canvas, direction: Direction, start_location: number[], end_location: number[] | undefined, top_left: number[], size: number, side_length: number, spacing: number, end_func: () => void | undefined = undefined) {
    this.canvas = canvas;
    this.context = this.canvas.context;
    //tile will either slide vertically or horizontally
    this.direction = direction;
    //based on mode, either change in x or y
    if (Direction.is_vertical(this.direction)) {
      this.constant = start_location[0];
      this.start = start_location[1];
      if (end_location) {
        this.end = end_location[1];
      } else if (this.direction === Direction.Up) {
        this.end = -1;
      } else if (this.direction === Direction.Down) {
        this.end = side_length;
      }
    } else if (Direction.is_horizontal(this.direction)) {
      this.constant = start_location[1];
      this.start = start_location[0];
      if (end_location) {
        this.end = end_location[0];
      } else if (this.direction === Direction.Left) {
        this.end = -1;
      } else if (this.direction === Direction.Right) {
        this.end = side_length;
      }
    }
    //top left coordinates for the entire tile grid
    this.top_left = top_left;
    //the size (height and width) of the tile
    this.size = size;
    //width and height of tile grid
    this.side_length = side_length;
    //spacing between tiles
    this.spacing = spacing;
    //function called on destroy, probably to emit the event to change tile color
    this.end_func = end_func;
    //starting frame
    this.start_frame = this.canvas.frame;
    //add to components
    this.canvas.components.push(this);
  }
  destroy() {
    //kill and remove self
    if (this.end_func) {
      //call end func
      this.end_func();
      //draw the tile, since the new tile won't render until the next frame
      if (this.end !== -1 && this.end !== this.side_length) {
        let x: number;
        let y: number;
        if (Direction.is_vertical(this.direction)) {
          x = this.top_left[0]+this.constant*(this.size+this.spacing);
          y = this.top_left[1]+this.end*(this.size+this.spacing);
        } else if (Direction.is_horizontal(this.direction)) {
          y = this.top_left[1]+this.constant*(this.size+this.spacing);
          x = this.top_left[0]+this.end*(this.size+this.spacing);
        }
        let path = new Path2D();
        path.rect(x, y, this.size, this.size);
        this.context.fillStyle = Color.to_hex(Color.Movable);
        this.context.fill(path);
      }
    }
    let self = this;
    this.canvas.components = this.canvas.components.filter((item) => item !== self);
  }
  update() {
    const FRAMES_PER_TILE = 3;
    const TOTAL_FRAMES = Math.abs((this.end-this.start)*FRAMES_PER_TILE);
    if (TOTAL_FRAMES+this.start_frame < this.canvas.frame) {
      this.destroy();
      return;
    }
    //simplified ((this.end-this.start)*(this.size+this.spacing))/((this.end-this.start)*FRAMES_PER_TILE)
    let frame_distance: number = (this.size+this.spacing)/FRAMES_PER_TILE;
    if (this.direction === Direction.Up || this.direction === Direction.Left) {
      frame_distance = -frame_distance;
    }
    //get starting coords
    let frame_diff = this.canvas.frame-this.start_frame;
    let x: number;
    let y: number;
    if (Direction.is_vertical(this.direction)) {
      x = this.top_left[0]+this.constant*(this.size+this.spacing);
      y = this.top_left[1]+this.start*(this.size+this.spacing)+(frame_diff*frame_distance);
    } else if (Direction.is_horizontal(this.direction)) {
      x = this.top_left[0]+this.start*(this.size+this.spacing)+(frame_diff*frame_distance);
      y = this.top_left[1]+this.constant*(this.size+this.spacing);
    }
    //make sure the square will not get past the grid
    let x_size: number = this.size;
    let y_size: number = this.size;
    let y_max: number = this.top_left[1]+this.side_length*(this.spacing+this.size)-this.spacing;
    let x_max: number = this.top_left[0]+this.side_length*(this.spacing+this.size)-this.spacing;
    if (this.direction === Direction.Up && y < this.top_left[1]) {
      y_size = (y+this.size)-this.top_left[1];
      y = this.top_left[1];
    } else if (this.direction === Direction.Left && x < this.top_left[0]) {
      x_size = (x+this.size)-this.top_left[0];
      x = this.top_left[0];
    } else if (this.direction === Direction.Down && y+y_size > y_max) {
      y_size = y_max-y;
    } else if (this.direction === Direction.Right && x+x_size > x_max) {
      x_size = x_max-x;
    }
    if (x_size < 0 || y_size < 0) {
      this.destroy();
      return;
    }
    //draw sliding tile
    let path: Path2D = new Path2D();
    path.rect(x, y, x_size, y_size);
    this.context.fillStyle = Color.to_hex(Color.Movable);
    this.context.fill(path);
  }
}

export class TextButton implements Component, Clickable {
  canvas: Canvas;
  context: CanvasRenderingContext2D;
  text: string;
  readonly text_color: string;
  readonly hover_color: string;
  text_font: string;
  coords: number[];
  click_func: () => void;
  centered: boolean;
  click_disabled: boolean;
  hovered: boolean;

  readonly type: string = "text-button";

  constructor(canvas: Canvas, text: string, text_color: string, hover_color: string, text_font: string, coords: number[], click_func: () => void, centered?: boolean) {
    this.canvas = canvas;
    this.context = this.canvas.context;
    //actual text of button
    this.text = text;
    //color of text, and color of text on hover
    this.text_color = text_color;
    this.hover_color = hover_color;
    //text style (eg 10px Arial)
    this.text_font = text_font;
    //bottom left of text [x, y]
    this.coords = coords;
    //function run on click
    this.click_func = click_func;
    //centered text, handles if undefined
    this.centered = centered ? centered : false;
    //if true, ignore clicks
    this.click_disabled = false;
    //true if user is hovering over the textbutton
    this.hovered = false;
    //register for events
    this.canvas.addEvent("click", [this], false);
    this.canvas.addEvent("mousemove", [this], false);
    //add to components
    this.canvas.components.push(this);
  }
  update() {
    this.context.font = this.text_font;
    if (this.hovered) {
      this.context.fillStyle = this.hover_color;
    } else {
      this.context.fillStyle = this.text_color;
    }
    if (this.centered) {
      this.context.textAlign = "center";
    }
    this.context.fillText(this.text, this.coords[0], this.coords[1]);
    this.context.textAlign = "start";
  }
  static within_bounds(textbutton: TextButton, e: MouseEvent) {
    const margin = 5;
    textbutton.context.font = textbutton.text_font;
    let measured = textbutton.context.measureText(textbutton.text);
    let small_x: number = textbutton.coords[0]-margin;
    let big_x: number = textbutton.coords[0]+measured.width+margin;
    //actualBoundingBoxAscent is text height, kinda
    let small_y: number = textbutton.coords[1]-measured.actualBoundingBoxAscent-margin;
    let big_y: number = textbutton.coords[1]+margin;
    if (e.offsetX > small_x && e.offsetX < big_x && e.offsetY > small_y && e.offsetY < big_y) {
      return true;
    } else {
      return false;
    }
  }
  click(e: MouseEvent) {
    if (this.click_disabled) return;
    //check to make sure it is within bounds
    if (!TextButton.within_bounds(this, e)) return;
    //run the function
    this.click_func();
  }
  mousemove(e: MouseEvent) {
    //check to make sure it is within bounds, and click is enabled
    if (this.click_disabled || !TextButton.within_bounds(this, e)) {
      if (this.hovered) {
        this.hovered = false;
        this.canvas.canvas.style.cursor = "default";
      }
      return;
    };
    //set cursor and hover
    this.canvas.canvas.style.cursor = "pointer";
    this.hovered = true;
  }
}

export class TextLine implements Component {
  canvas: Canvas;
  context: CanvasRenderingContext2D;
  text: string;
  text_color: string;
  text_font: string;
  coords: number[];
  centered?: boolean;

  readonly type: string = "text";

  constructor(canvas: Canvas, text: string, text_color: string, text_font: string, coords: number[], centered?: boolean) {
    this.canvas = canvas;
    this.context = this.canvas.context;
    //the text of the text. does this really need a comment?
    this.text = text;
    //color of the text
    this.text_color = text_color;
    //text font (eg 1em Times New Roman)
    this.text_font = text_font;
    //coords of text (lower left corner)
    this.coords = coords;
    //centered text, handles if undefined
    this.centered = centered ? centered : false;
    //add to components
    this.canvas.components.push(this);
  }
  update() {
    this.context.font = this.text_font;
    this.context.fillStyle = this.text_color;
    if (this.centered) {
      this.context.textAlign = "center";
    }
    this.context.fillText(this.text, this.coords[0], this.coords[1]);
    //reset alignment
    this.context.textAlign = "start";
  }
}

export class Counter extends TextLine implements Component {
  pre_text: string;
  get_value: () => string;

  readonly type: string = "counter";

  constructor(canvas: Canvas, pre_text: string, text_color: string, text_font: string, coords: number[], get_value: () => string) {
    super(canvas, pre_text, text_color, text_font, coords);
    //counter exclusive properties
    this.pre_text = pre_text;
    this.get_value = get_value;
  }
  update() {
    this.text = this.pre_text+this.get_value();
    super.update();
  }
}

//popup for help, start, or win? I guess...
export class Popup implements Component {
  canvas: Canvas;
  context: CanvasRenderingContext2D;
  children: Component[];
  top_left: number[];
  width: number;
  height: number;

  readonly type: string = "popup";

  constructor(canvas: Canvas) {
    this.canvas = canvas;
    this.context = this.canvas.context;
    //calculate top left, and dimensions
    if (this.canvas.size[0] < 570) {
      this.top_left = [65, 45];
      this.width = this.canvas.size[0]-130;
      this.height = this.canvas.size[1]-90;
    } else {
      this.top_left = [130, 90];
      this.width = this.canvas.size[0]-260;
      this.height = this.canvas.size[1]-180;
    }
    //disable click (will not effect popup members since they don't exist yet)
    this.canvas.components.forEach((component: Component) => {
      if (Clickable.is_clickable(component)) {
        component.click_disabled = true;
      }
    });
    //members of the popup
    this.children = [];
    //add to components
    this.canvas.components.push(this);
  }
  close() {
    //remove self and children
    let self = this;
    this.canvas.components = this.canvas.components.filter((item) => item !== self && !self.children.includes(item));
    //undisable click
    this.canvas.components.forEach((component: Component) => {
      if (Clickable.is_clickable(component)) {
        component.click_disabled = false;
      }
    });
    //reset cursor state
    this.canvas.canvas.style.cursor = "default";
  }
  update() {
    this.context.fillStyle = color_table.modal_behind;
    this.context.fillRect(0, 0, this.canvas.size[0], this.canvas.size[1]);
    let path: Path2D = new Path2D();
    if (this.canvas.size[0] < 570) {
      path.rect(this.top_left[0], this.top_left[1], this.width, this.height);
    } else {
      path.rect(this.top_left[0], this.top_left[1], this.width, this.height);
    }
    this.context.fillStyle = color_table.modal_background;
    this.context.fill(path);
    this.context.lineWidth = 1;
    this.context.strokeStyle = color_table.modal_border;
    this.context.stroke(path);
  }
}

//splits text into lines
export class Paragraph implements Component {
  canvas: Canvas;
  context: CanvasRenderingContext2D;
  text: string;
  text_color: string;
  text_font: string;
  max_width: number;
  calculated_height: number;
  coords: number[];
  lines: string[];

  readonly type: string = "paragraph";

  constructor(canvas: Canvas, text: string, text_color: string, text_font: string, max_width: number, coords: number[]) {
    this.canvas = canvas;
    this.context = this.canvas.context;
    //text of paragraph
    this.text = text;
    //color of text
    this.text_color = text_color;
    //font of text
    this.text_font = text_font;
    //maximum width of a line
    this.max_width = max_width;
    //[x, y] coords of 
    this.coords = coords;
    //calculate the lines of text
    this.lines = [];
    let current_line: string = "";
    let words = text.split(" ");
    this.context.font = this.text_font;
    for (let i=0; i < words.length; i++) {
      let word = words[i];
      current_line += word+" ";
      if (this.context.measureText(current_line.trim()).width > this.max_width) {
        //add current line not including just added word
        this.lines.push(current_line.trim().split(" ").slice(0, -1).join(" "));
        //could break if a single word is larger than the max width -prussia
        current_line = word+" ";
      }
      if (i === words.length-1) {
        //last word
        this.lines.push(current_line.trim());
      }
    }
    //calculate height (kinda)
    let height = this.context.measureText(this.lines[0]).actualBoundingBoxAscent;
    this.calculated_height = (height+5)*this.lines.length;
    //add to components
    this.canvas.components.push(this);
  }
  update() {
    //write lines at coords
    this.context.font = this.text_font;
    this.context.fillStyle = this.text_color;
    let height = this.context.measureText(this.lines[0]).actualBoundingBoxAscent;
    for (let i=0; i < this.lines.length; i++) {
      this.context.fillText(this.lines[i], this.coords[0], this.coords[1]+(height+5)*i);
    }
  }
}

//Ok fine, it uses video files. But 'Gif' sounds better than 'LoopingVideo' and is shorter too...
export class Gif implements Component {
  canvas: Canvas;
  context: CanvasRenderingContext2D;
  video: HTMLVideoElement;
  coords: number[];
  width: number;
  height: number;

  readonly type: string = "gif";

  constructor(canvas: Canvas, video: HTMLVideoElement, coords: number[], width: number, height: number) {
    this.canvas = canvas;
    this.context = this.canvas.context;
    //video that will loop
    this.video = video;
    //start playing video
    this.video.play();
    //coords [x, y] of video
    this.coords = coords;
    //width and height of video
    this.width = width;
    this.height = height;
    //add to components
    this.canvas.components.push(this);
  }
  update() {
    this.context.drawImage(this.video, this.coords[0], this.coords[1], this.width, this.height);
  }
  //sets it to loop
  static video_src_to_video(video_src: string): HTMLVideoElement {
    let video: HTMLVideoElement = document.createElement("VIDEO") as HTMLVideoElement;
    video.src = video_src;
    video.loop = true;
    return video;
  }
}
