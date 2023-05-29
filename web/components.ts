import { Canvas, Component } from './blackbeard';

export enum Color {
  Movable,
  Other,
}

let color_table: { [color_name: string]: string } = {
  "movable": "#0b8c4d",
  "other": "#9cc1bf",
  "selected": "#ffff00",
  "goal": "#1c28af",
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

export type ChangeColorCustomEvent = { detail: { location: number[], new_color: Color } };

export class Tile implements Component {
  canvas: Canvas;
  context: CanvasRenderingContext2D;
  readonly location: number[];
  color: Color;
  goal: boolean;
  top_left: number[];
  size: number;
  spacing: number;
  selected: boolean;
  click_disabled: boolean;

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
    //ignore clicks if true
    this.click_disabled = false;
    //register events
    this.canvas.addEvent("click", [this], false);
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
  click(e: MouseEvent) {
    let x1: number = this.top_left[0]+this.location[0]*(this.size+this.spacing);
    let y1: number = this.top_left[1]+this.location[1]*(this.size+this.spacing);
    let x2 = x1+this.size;
    let y2 = y1+this.size;
    //check to make sure click is within tile
    if (e.offsetX < x1 || e.offsetX > x2 || e.offsetY < y1 || e.offsetY > y2) {
      this.selected = false;
      return;
    }
    if (this.color !== Color.Movable) return;
    this.selected = true;
  }
  custom_change_color(e: ChangeColorCustomEvent) {
    if (this.location[0] !== e.detail.location[0] || this.location[1] !== e.detail.location[1]) return;
    this.color = e.detail.new_color;
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
    let self = this;
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

export class Popup implements Component {
  canvas: Canvas;
  context: CanvasRenderingContext2D;

  constructor(canvas: Canvas) {
    this.canvas = canvas;
    this.context = this.canvas.context;
    //
  }
  update() {
    //
  }
}
