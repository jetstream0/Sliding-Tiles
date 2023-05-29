import { Canvas } from './blackbeard';
import { Tile, SlidingTile, Color, Direction } from './components';
import { grid_to_grid_colors, move_tile } from './logic';
let page_height = window.innerHeight;
let page_width = window.innerWidth;
let size;
if (page_height > page_width) {
    size = [page_width - 40, page_width - 40];
}
else {
    size = [page_height - 40, page_height - 40];
}
//constants, somewhat arbitrary
const TOP_LEFT = [25, 50];
const SPACING = 5;
//set up canvas
let canvas = new Canvas(size, "sliding-tiles-canvas", document.getElementById("canvas-container"));
//12 fps
//we can't do `setInterval(canvas.update(), ...);`,
//cause that fucks with the `this` in `canvas.update` -prussia
setInterval(function () {
    canvas.update();
}, 1000 / 15);
//side_length is height and width of grid, movable is amount of tiles that should be movable, last item of steps array is the solution
function gen_grid(side_length, movable, moves) {
    const tile_size = Math.floor((size[0] - side_length * SPACING - TOP_LEFT[0] * 2) / side_length);
    let assigned_movable = 0;
    let gened_grid = [];
    for (let i = 0; i < side_length ** 2; i++) {
        let color;
        if (assigned_movable < movable) {
            color = Color.Movable;
            assigned_movable++;
        }
        else {
            color = Color.Other;
        }
        //add rand property for shuffling
        gened_grid.push({
            color,
            rand: Math.random(),
        });
    }
    //shuffle grid
    gened_grid.sort((a, b) => {
        //could just do something like `return a.rand-b.rand`,
        //but I think is more readable -prussia
        if (a.rand > b.rand) {
            return 1;
        }
        else if (a.rand < b.rand) {
            return -1;
        }
        else {
            return 0;
        }
    });
    //make solution
    let steps = [];
    let solution_grid = gened_grid.map((item) => item.color);
    for (let j = 0; j < moves; j++) {
        //get random movable tile locations
        let movable_locations = [];
        for (let jj = 0; jj < solution_grid.length; jj++) {
            if (solution_grid[jj] === Color.Movable) {
                //push location of the movable tile [x, y]
                movable_locations.push([jj % side_length, Math.floor(jj / side_length)]);
            }
        }
        //we want to leave at least 1 tile
        if (movable_locations.length === 1)
            break;
        //get random movable location
        let random_location = movable_locations[Math.floor(Math.random() * movable_locations.length)];
        //random direction
        let random_direction = Direction.random_direction();
        //simulate the move
        let changed = move_tile(solution_grid, side_length, random_location, random_direction);
        //bias towards direction that doesn't result in tile leaving
        for (let k = 0; k < 3; k++) {
            if (!changed.end && Math.random() < 0.9) {
                random_direction = Direction.next_direction(random_direction);
                changed = move_tile(solution_grid, side_length, random_location, random_direction);
            }
            else {
                break;
            }
        }
        //now change
        if (changed.start.location[0] === changed.end?.location[0] && changed.start.location[1] === changed.end?.location[1])
            continue;
        solution_grid[changed.start.location[1] * side_length + changed.start.location[0]] = Color.Other;
        if (changed.end) {
            solution_grid[changed.end.location[1] * side_length + changed.end.location[0]] = Color.Movable;
        }
        steps.push(solution_grid);
    }
    //create tile
    let grid = gened_grid.map((item, index) => {
        let location_x = index % side_length;
        let location_y = Math.floor(index / side_length);
        let tile;
        if (solution_grid[location_y * side_length + location_x] === Color.Movable) {
            tile = new Tile(canvas, [location_x, location_y], item.color, true, TOP_LEFT, tile_size, SPACING);
        }
        else {
            tile = new Tile(canvas, [location_x, location_y], item.color, false, TOP_LEFT, tile_size, SPACING);
        }
        return tile;
    });
    canvas.update();
    return [grid, tile_size, steps];
}
const SIDE_LENGTH = 10;
let [canvas_grid, tile_size, _steps] = gen_grid(SIDE_LENGTH, 18, 25);
document.addEventListener("keydown", (e) => {
    let direction;
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
    let selected_location;
    for (let i = 0; i < canvas_grid.length; i++) {
        if (canvas_grid[i].selected) {
            selected_location = canvas_grid[i].location;
        }
    }
    //no tiles selected
    if (!selected_location)
        return;
    //move the tiles!
    let changed = move_tile(grid_to_grid_colors(canvas_grid), SIDE_LENGTH, selected_location, direction);
    //no change in location
    if (changed.start.location[0] === changed.end?.location[0] && changed.start.location[1] === changed.end?.location[1])
        return;
    let start_custom_event = {
        detail: changed.start,
    };
    canvas.canvas.dispatchEvent(new CustomEvent("custom_change_color", start_custom_event));
    if (changed.end) {
        let end_custom_event = {
            detail: changed.end,
        };
        new SlidingTile(canvas, direction, changed.start.location, changed.end?.location, TOP_LEFT, tile_size, SIDE_LENGTH, SPACING, function () {
            canvas.canvas.dispatchEvent(new CustomEvent("custom_change_color", end_custom_event));
        });
    }
    else {
        new SlidingTile(canvas, direction, changed.start.location, changed.end?.location, TOP_LEFT, tile_size, SIDE_LENGTH, SPACING);
    }
});
