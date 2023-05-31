import { Color, Direction } from './components.js';
//change grid to array of colors
export function grid_to_grid_colors(grid) {
    let grid_colors = [];
    for (let i = 0; i < grid.length; i++) {
        grid_colors.push(grid[i].color);
    }
    return grid_colors;
}
//location is the location [x, y] of the tile being moved, returns the old and new location of the tile (if any), including their new colors
export function move_tile(grid_colors, side_length, location, direction) {
    if (grid_colors[location[1] * side_length + location[0]]) {
        throw Error(`Tile at location [${location[0]}, ${location[1]}] is unmovable`);
    }
    for (let i = 1; i < side_length + 1; i++) {
        let prev_direction_x;
        let prev_direction_y;
        let direction_x;
        let direction_y;
        if (direction === Direction.Up) {
            direction_x = location[0];
            direction_y = location[1] - i;
            prev_direction_x = direction_x;
            prev_direction_y = direction_y + 1;
        }
        else if (direction === Direction.Down) {
            direction_x = location[0];
            direction_y = location[1] + i;
            prev_direction_x = direction_x;
            prev_direction_y = direction_y - 1;
        }
        else if (direction === Direction.Left) {
            direction_x = location[0] - i;
            direction_y = location[1];
            prev_direction_x = direction_x + 1;
            prev_direction_y = direction_y;
        }
        else if (direction === Direction.Right) {
            direction_x = location[0] + i;
            direction_y = location[1];
            prev_direction_x = direction_x - 1;
            prev_direction_y = direction_y;
        }
        if (direction_x < 0 || direction_x >= side_length || direction_y < 0 || direction_y >= side_length) {
            //the tile goes off the edge of the grid
            return {
                start: {
                    new_color: Color.Other,
                    location,
                },
                end: undefined,
            };
        }
        let direction_color = grid_colors[(direction_y * side_length) + direction_x];
        if (direction_color === Color.Other)
            continue;
        //This is a movable color, the tile
        return {
            start: {
                new_color: Color.Other,
                location,
            },
            end: {
                new_color: Color.Movable,
                location: [prev_direction_x, prev_direction_y],
            },
        };
    }
}
export function solved(current, solution) {
    return current.every((current_item, index) => current_item === solution[index]);
}
//get # of moves that computer should do to generate the puzzle
export function get_generate_moves() {
    //should be inclusive range of 24-35
    return 24 + Math.floor(Math.random() * 12);
}
