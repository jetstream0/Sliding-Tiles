import { Canvas } from './blackbeard';
import { Tile, SlidingTile, TextButton, TextLine, Counter, Popup, Paragraph, Gif, Color, Direction, ChangeColorCustomEvent, color_table } from './components';
import { ChangeReturn, Grid, grid_to_grid_colors, move_tile, solved, get_generate_moves } from './logic';

type GenGridItem = {
  color: Color,
  rand: number,
};

let page_height: number = window.innerHeight;
let page_width: number = window.innerWidth;

let size: number[];
if (page_height > page_width) {
  size = [page_width-40, page_width-40];
} else {
  size = [page_height-40, page_height-40];
}

//constants, somewhat arbitrary
const TOP_LEFT = [25, 50];
const SPACING = 5;

//set up canvas
let canvas = new Canvas(size, "sliding-tiles-canvas", document.getElementById("canvas-container")!);

//15 fps
//we can't do `setInterval(canvas.update, ...);`,
//cause that fucks with the `this` in `canvas.update` -prussia
setInterval(function() {
  canvas.update();
}, 1000/15);

//side_length is height and width of grid, movable is amount of tiles that should be movable, last item of steps array is the solution
function gen_grid(side_length: number, movable: number, moves: number): [Grid, number, Color[][]] {
  const tile_size: number = Math.floor((size[0]-side_length*SPACING-TOP_LEFT[0]*2)/side_length);
  let assigned_movable: number = 0;
  let gened_grid: GenGridItem[] = [];
  for (let i=0; i < side_length**2; i++) {
    let color: Color;
    if (assigned_movable < movable) {
      color = Color.Movable;
      assigned_movable++;
    } else {
      color = Color.Other;
    }
    //add rand property for shuffling
    gened_grid.push({
      color,
      rand: Math.random(),
    });
  }
  //shuffle grid
  gened_grid.sort((a: GenGridItem, b: GenGridItem) => {
    //could just do something like `return a.rand-b.rand`,
    //but I think is more readable -prussia
    if (a.rand > b.rand) {
      return 1;
    } else if (a.rand < b.rand) {
      return -1;
    } else {
      return 0;
    }
  })
  //make solution
  let steps: Color[][] = [];
  let solution_grid: Color[] = gened_grid.map((item) => item.color);
  for (let j=0; j < moves; j++) {
    //get random movable tile locations
    let movable_locations: number[][] = [];
    for (let jj=0; jj < solution_grid.length; jj++) {
      if (solution_grid[jj] === Color.Movable) {
        //push location of the movable tile [x, y]
        movable_locations.push([jj%side_length, Math.floor(jj/side_length)]);
      }
    }
    //we want to leave at least 1 tile
    if (movable_locations.length === 1) break;
    //get random movable location
    let random_location: number[] = movable_locations[Math.floor(Math.random()*movable_locations.length)];
    //random direction
    let random_direction = Direction.random_direction();
    //simulate the move
    let changed: ChangeReturn = move_tile(solution_grid, side_length, random_location, random_direction);
    //bias towards direction that doesn't result in tile leaving
    for (let k=0; k < 3; k++) {
      if (!changed.end && Math.random() < 0.9) {
        random_direction = Direction.next_direction(random_direction);
        changed = move_tile(solution_grid, side_length, random_location, random_direction);
      } else {
        break;
      }
    }
    //now change
    if (changed.start.location[0] === changed.end?.location[0] && changed.start.location[1] === changed.end?.location[1]) continue;
    solution_grid[changed.start.location[1]*side_length+changed.start.location[0]] = Color.Other;
    if (changed.end) {
      solution_grid[changed.end.location[1]*side_length+changed.end.location[0]] = Color.Movable;
    }
    steps.push(solution_grid);
  }
  //create tile
  let grid: Grid = gened_grid.map((item, index) => {
    let location_x: number = index%side_length;
    let location_y: number = Math.floor(index/side_length);
    let tile: Tile;
    if (solution_grid[location_y*side_length+location_x] === Color.Movable) {
      tile = new Tile(canvas, [location_x, location_y], item.color, true, TOP_LEFT, tile_size, SPACING);
    } else {
      tile = new Tile(canvas, [location_x, location_y], item.color, false, TOP_LEFT, tile_size, SPACING);
    }
    return tile;
  });
  canvas.update();
  return [grid, tile_size, steps];
}

function revert_grid_state(grid: Grid, colors: Color[]) {
  for (let i=0; i < grid.length; i++) {
    grid[i].color = colors[i];
  }
}

const SIDE_LENGTH = 10;
let [canvas_grid, tile_size, steps] = gen_grid(SIDE_LENGTH, 18, get_generate_moves());

//doesn't include current grid state
let history: Color[][] = [];

let stagger: number;
let help_stagger: number;
if (size[0] > 500) {
  stagger = 120;
  help_stagger = 20;
} else {
  stagger = 100;
  help_stagger = 15;
}

//top buttons and count
function add_top() {
  //count of moves
  new Counter(canvas, "Moves: ", color_table.text_primary, "1em Verdana", [TOP_LEFT[0], TOP_LEFT[1]-10], () => {
    return String(history.length);
  });

  //reset, undo, help buttons
  new TextButton(canvas, "Reset", color_table.text_primary, color_table.text_hover, "1em Verdana", [size[0]-stagger, TOP_LEFT[1]-10], () => {
    //if history length is 0, grid is still in it's initial state, there is nothing to reset
    if (history.length === 0) return;
    //reset history and revert grid state
    revert_grid_state(canvas_grid, history[0]);
    history = [];
  });

  new TextButton(canvas, "Undo", color_table.text_primary, color_table.text_hover, "1em Verdana", [size[0]-stagger-55, TOP_LEFT[1]-10], () => {
    //if history length is 0, grid is still in it's initial state, there is nothing to undo
    if (history.length === 0) return;
    //reset history and revert grid state (last item in history is the previous state)
    revert_grid_state(canvas_grid, history[history.length-1]);
    history = history.slice(0, -1);
  });

  new TextButton(canvas, "?", color_table.text_primary, color_table.text_hover, "1em Verdana", [size[0]-TOP_LEFT[0]-help_stagger, TOP_LEFT[1]-10], () => {
    let help_popup: Popup = new Popup(canvas);
    //close button for popup
    help_popup.children.push(new TextButton(canvas, "x", color_table.text_primary, color_table.text_hover, "1.4em Verdana", [help_popup.top_left[0]+help_popup.width-42, help_popup.top_left[1]+27], () => {
      help_popup.close();
    }));
    //handle very very small canvases (for fun)
    let header_font: string;
    let paragraph_font: string;
    let left_margin: number;
    let max_width_sub: number;
    let header_x_offset: number;
    let header_bottom_margin: number;
    if (size[0] >= 375) {
      header_font = "2em Verdana";
      paragraph_font = "0.95em Verdana";
      left_margin = 25;
      max_width_sub = 42;
      header_x_offset = 45;
      header_bottom_margin = 25;
    } else {
      header_font = "1.4em Verdana";
      paragraph_font = "0.75em Verdana";
      left_margin = 15;
      max_width_sub = 27;
      header_x_offset = 30;
      header_bottom_margin = 15;
    }
    //help header
    help_popup.children.push(new TextLine(canvas, "Help", color_table.text_primary, header_font, [help_popup.top_left[0]+left_margin, help_popup.top_left[1]+header_x_offset]));
    //explainer paragraphs and gifs
    let first_paragraph_y: number = help_popup.top_left[1]+header_x_offset+header_bottom_margin;
    let first_paragraph: Paragraph = new Paragraph(canvas, "The green tiles are movable. Click them, and use the arrow or WASD keys.", color_table.text_primary, paragraph_font, help_popup.width-max_width_sub, [help_popup.top_left[0]+left_margin, first_paragraph_y]);
    help_popup.children.push(first_paragraph);
    //aspect ratio is roughly 5 width x 2 height
    let gif_width: number = help_popup.width-142;
    let gif_height: number = gif_width*0.4;
    if (size[0] < 550) {
      gif_width *= 0.75;
      gif_height *= 0.75;
    }
    let first_gif_y: number = first_paragraph_y+first_paragraph.calculated_height-4;
    //since coords of the paragraph is calculated from the first line's lower left corner `.calculated_height` is bigger than we need, which is good for us
    help_popup.children.push(new Gif(canvas, Gif.video_src_to_video("/tile_bump_blue.webm"), [help_popup.top_left[0]+left_margin, first_gif_y], gif_width, gif_height));
    let second_paragraph_y: number = first_gif_y+gif_height+18;
    let second_paragraph: Paragraph = new Paragraph(canvas, "The green tiles will keep moving, even offscreen, unless blocked by another green tile. To win, move the green tiles into the blue outlined tiles, with all other tiles empty.", color_table.text_primary, paragraph_font, help_popup.width-max_width_sub, [help_popup.top_left[0]+left_margin, second_paragraph_y]);
    help_popup.children.push(second_paragraph);
    //second gif doesn't fit when canvas is very small
    if (size[0] >= 435) {
      let second_gif_y: number = second_paragraph_y+second_paragraph.calculated_height-4;
      help_popup.children.push(new Gif(canvas, Gif.video_src_to_video("/tile_off.webm"), [help_popup.top_left[0]+left_margin, second_gif_y], gif_width, gif_height));
    }
  });
}

add_top();

document.addEventListener("keydown", (e: KeyboardEvent) => {
  let direction: Direction;
  switch (e.key.toLowerCase()) {
    case "arrowup":
    case "w":
      direction = Direction.Up;
      break;
    case "arrowdown":
    case "s":
      direction = Direction.Down;
      break;
    case "arrowleft":
    case "a":
      direction = Direction.Left;
      break;
    case "arrowright":
    case "d":
      direction = Direction.Right;
      break;
    default:
      return;
  }
  //get selected location
  let selected_location: number[];
  for (let i=0; i < canvas_grid.length; i++) {
    if (canvas_grid[i].selected) {
      selected_location = canvas_grid[i].location;
    }
  }
  //no tiles selected
  if (!selected_location) return;
  //move the tiles!
  let changed: ChangeReturn = move_tile(grid_to_grid_colors(canvas_grid), SIDE_LENGTH, selected_location, direction);
  //no change in location
  if (changed.start.location[0] === changed.end?.location[0] && changed.start.location[1] === changed.end?.location[1]) return;
  //add the (now) old grid state to history
  history.push(grid_to_grid_colors(canvas_grid));
  let start_custom_event: ChangeColorCustomEvent = {
    detail: changed.start,
  };
  canvas.canvas.dispatchEvent(new CustomEvent("custom_change_color", start_custom_event));
  if (changed.end) {
    let end_custom_event: ChangeColorCustomEvent = {
      detail: changed.end,
    };
    end_custom_event.detail.suppress = true;
    canvas.canvas.dispatchEvent(new CustomEvent("custom_change_color", end_custom_event));
    new SlidingTile(canvas, direction, changed.start.location, changed.end?.location, TOP_LEFT, tile_size, SIDE_LENGTH, SPACING, function() {
      end_custom_event.detail.suppress = false;
      canvas.canvas.dispatchEvent(new CustomEvent("custom_change_color", end_custom_event));
    });
  } else {
    new SlidingTile(canvas, direction, changed.start.location, changed.end?.location, TOP_LEFT, tile_size, SIDE_LENGTH, SPACING);
  }
  //check if player won
  let solution: Color[] = steps[steps.length-1];
  if (solved(grid_to_grid_colors(canvas_grid), solution)) {
    //won
    let win_popup: Popup = new Popup(canvas);
    //close button for popup
    win_popup.children.push(new TextButton(canvas, "x", color_table.text_primary, color_table.text_hover, "1.4em Verdana", [win_popup.top_left[0]+win_popup.width-42, win_popup.top_left[1]+27], () => {
      win_popup.close();
    }));
    //you won! header and moves count
    win_popup.children.push(new TextLine(canvas, "You Won!", color_table.text_primary, "1.5em Verdana", [win_popup.top_left[0]+win_popup.width/2, win_popup.top_left[1]+65], true));
    win_popup.children.push(new TextLine(canvas, `In ${history.length} moves.`, color_table.text_primary, "1em Verdana", [win_popup.top_left[0]+win_popup.width/2, win_popup.top_left[1]+85], true));
    //play again button
    win_popup.children.push(new TextButton(canvas, "Play Again", color_table.text_primary, color_table.text_hover, "1.2em Verdana", [win_popup.top_left[0]+win_popup.width/2, win_popup.top_left[1]+115], () => {
      canvas.reset();
      [canvas_grid, tile_size, steps] = gen_grid(SIDE_LENGTH, 18, get_generate_moves());
      //doesn't include current grid state
      history = [];
      add_top();
    }, true));
  }
});
