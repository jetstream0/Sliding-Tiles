export var Color;
(function (Color) {
    Color[Color["Movable"] = 0] = "Movable";
    Color[Color["Other"] = 1] = "Other";
})(Color || (Color = {}));
export let color_table = {
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
(function (Color) {
    function to_hex(color) {
        let hex;
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
    Color.to_hex = to_hex;
})(Color || (Color = {}));
var Clickable;
(function (Clickable) {
    function is_clickable(obj) {
        return typeof obj.click_disabled === "boolean" && typeof obj.click === "function";
    }
    Clickable.is_clickable = is_clickable;
})(Clickable || (Clickable = {}));
export class Tile {
    canvas;
    context;
    location;
    color;
    goal;
    top_left;
    size;
    spacing;
    selected;
    suppress;
    hovered;
    click_disabled;
    type = "tile";
    constructor(canvas, location, color, goal = false, top_left, size, spacing) {
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
        let x = this.top_left[0] + this.location[0] * (this.size + this.spacing);
        let y = this.top_left[1] + this.location[1] * (this.size + this.spacing);
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
        }
        else if (this.goal) {
            this.context.lineWidth = 2;
            this.context.strokeStyle = color_table["goal"];
            this.context.stroke(path);
        }
    }
    static within_bounds(tile, e) {
        let x1 = tile.top_left[0] + tile.location[0] * (tile.size + tile.spacing);
        let y1 = tile.top_left[1] + tile.location[1] * (tile.size + tile.spacing);
        let x2 = x1 + tile.size;
        let y2 = y1 + tile.size;
        //check to make sure click is within tile
        if (e.offsetX < x1 || e.offsetX > x2 || e.offsetY < y1 || e.offsetY > y2) {
            return false;
        }
        else {
            return true;
        }
    }
    click(e) {
        if (this.click_disabled)
            return;
        let x1 = this.top_left[0] + this.location[0] * (this.size + this.spacing);
        let y1 = this.top_left[1] + this.location[1] * (this.size + this.spacing);
        let x2 = x1 + this.size;
        let y2 = y1 + this.size;
        //check to make sure click is within tile
        if (!Tile.within_bounds(this, e)) {
            this.selected = false;
            return;
        }
        if (this.color !== Color.Movable)
            return;
        this.selected = true;
    }
    mousemove(e) {
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
    custom_change_color(e) {
        if (this.location[0] !== e.detail.location[0] || this.location[1] !== e.detail.location[1])
            return;
        this.color = e.detail.new_color;
        if (e.detail.suppress) {
            this.suppress = true;
        }
        else {
            this.suppress = false;
        }
    }
}
//directions that tiles can move
export var Direction;
(function (Direction) {
    Direction[Direction["Up"] = 0] = "Up";
    Direction[Direction["Down"] = 1] = "Down";
    Direction[Direction["Left"] = 2] = "Left";
    Direction[Direction["Right"] = 3] = "Right";
})(Direction || (Direction = {}));
(function (Direction) {
    function random_direction() {
        return [Direction.Up, Direction.Down, Direction.Left, Direction.Right][Math.floor(Math.random() * 4)];
    }
    Direction.random_direction = random_direction;
    function is_vertical(direction) {
        return direction === Direction.Up || direction === Direction.Down;
    }
    Direction.is_vertical = is_vertical;
    function is_horizontal(direction) {
        return direction === Direction.Left || direction === Direction.Right;
    }
    Direction.is_horizontal = is_horizontal;
    function next_direction(direction) {
        if (direction === Direction.Up) {
            return Direction.Down;
        }
        else if (direction === Direction.Down) {
            return Direction.Left;
        }
        else if (direction === Direction.Left) {
            return Direction.Right;
        }
        else if (direction === Direction.Right) {
            return Direction.Up;
        }
    }
    Direction.next_direction = next_direction;
})(Direction || (Direction = {}));
//the sliding tile animation thing
export class SlidingTile {
    canvas;
    context;
    direction;
    constant;
    start;
    end;
    top_left;
    size;
    side_length;
    spacing;
    end_func;
    start_frame;
    type = "sliding-tile";
    constructor(canvas, direction, start_location, end_location, top_left, size, side_length, spacing, end_func = undefined) {
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
            }
            else if (this.direction === Direction.Up) {
                this.end = -1;
            }
            else if (this.direction === Direction.Down) {
                this.end = side_length;
            }
        }
        else if (Direction.is_horizontal(this.direction)) {
            this.constant = start_location[1];
            this.start = start_location[0];
            if (end_location) {
                this.end = end_location[0];
            }
            else if (this.direction === Direction.Left) {
                this.end = -1;
            }
            else if (this.direction === Direction.Right) {
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
                let x;
                let y;
                if (Direction.is_vertical(this.direction)) {
                    x = this.top_left[0] + this.constant * (this.size + this.spacing);
                    y = this.top_left[1] + this.end * (this.size + this.spacing);
                }
                else if (Direction.is_horizontal(this.direction)) {
                    y = this.top_left[1] + this.constant * (this.size + this.spacing);
                    x = this.top_left[0] + this.end * (this.size + this.spacing);
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
        const TOTAL_FRAMES = Math.abs((this.end - this.start) * FRAMES_PER_TILE);
        if (TOTAL_FRAMES + this.start_frame < this.canvas.frame) {
            this.destroy();
            return;
        }
        //simplified ((this.end-this.start)*(this.size+this.spacing))/((this.end-this.start)*FRAMES_PER_TILE)
        let frame_distance = (this.size + this.spacing) / FRAMES_PER_TILE;
        if (this.direction === Direction.Up || this.direction === Direction.Left) {
            frame_distance = -frame_distance;
        }
        //get starting coords
        let frame_diff = this.canvas.frame - this.start_frame;
        let x;
        let y;
        if (Direction.is_vertical(this.direction)) {
            x = this.top_left[0] + this.constant * (this.size + this.spacing);
            y = this.top_left[1] + this.start * (this.size + this.spacing) + (frame_diff * frame_distance);
        }
        else if (Direction.is_horizontal(this.direction)) {
            x = this.top_left[0] + this.start * (this.size + this.spacing) + (frame_diff * frame_distance);
            y = this.top_left[1] + this.constant * (this.size + this.spacing);
        }
        //make sure the square will not get past the grid
        let x_size = this.size;
        let y_size = this.size;
        let y_max = this.top_left[1] + this.side_length * (this.spacing + this.size) - this.spacing;
        let x_max = this.top_left[0] + this.side_length * (this.spacing + this.size) - this.spacing;
        if (this.direction === Direction.Up && y < this.top_left[1]) {
            y_size = (y + this.size) - this.top_left[1];
            y = this.top_left[1];
        }
        else if (this.direction === Direction.Left && x < this.top_left[0]) {
            x_size = (x + this.size) - this.top_left[0];
            x = this.top_left[0];
        }
        else if (this.direction === Direction.Down && y + y_size > y_max) {
            y_size = y_max - y;
        }
        else if (this.direction === Direction.Right && x + x_size > x_max) {
            x_size = x_max - x;
        }
        if (x_size < 0 || y_size < 0) {
            this.destroy();
            return;
        }
        //draw sliding tile
        let path = new Path2D();
        path.rect(x, y, x_size, y_size);
        this.context.fillStyle = Color.to_hex(Color.Movable);
        this.context.fill(path);
    }
}
export class TextButton {
    canvas;
    context;
    text;
    text_color;
    hover_color;
    text_font;
    coords;
    click_func;
    centered;
    click_disabled;
    hovered;
    type = "text-button";
    constructor(canvas, text, text_color, hover_color, text_font, coords, click_func, centered) {
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
        }
        else {
            this.context.fillStyle = this.text_color;
        }
        if (this.centered) {
            this.context.textAlign = "center";
        }
        this.context.fillText(this.text, this.coords[0], this.coords[1]);
        this.context.textAlign = "start";
    }
    static within_bounds(textbutton, e) {
        const margin = 5;
        textbutton.context.font = textbutton.text_font;
        let measured = textbutton.context.measureText(textbutton.text);
        let small_x = textbutton.coords[0] - margin;
        let big_x = textbutton.coords[0] + measured.width + margin;
        //actualBoundingBoxAscent is text height, kinda
        let small_y = textbutton.coords[1] - measured.actualBoundingBoxAscent - margin;
        let big_y = textbutton.coords[1] + margin;
        if (e.offsetX > small_x && e.offsetX < big_x && e.offsetY > small_y && e.offsetY < big_y) {
            return true;
        }
        else {
            return false;
        }
    }
    click(e) {
        if (this.click_disabled)
            return;
        //check to make sure it is within bounds
        if (!TextButton.within_bounds(this, e))
            return;
        //run the function
        this.click_func();
    }
    mousemove(e) {
        //check to make sure it is within bounds, and click is enabled
        if (this.click_disabled || !TextButton.within_bounds(this, e)) {
            if (this.hovered) {
                this.hovered = false;
                this.canvas.canvas.style.cursor = "default";
            }
            return;
        }
        ;
        //set cursor and hover
        this.canvas.canvas.style.cursor = "pointer";
        this.hovered = true;
    }
}
export class TextLine {
    canvas;
    context;
    text;
    text_color;
    text_font;
    coords;
    centered;
    type = "text";
    constructor(canvas, text, text_color, text_font, coords, centered) {
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
export class Counter extends TextLine {
    pre_text;
    get_value;
    type = "counter";
    constructor(canvas, pre_text, text_color, text_font, coords, get_value) {
        super(canvas, pre_text, text_color, text_font, coords);
        //counter exclusive properties
        this.pre_text = pre_text;
        this.get_value = get_value;
    }
    update() {
        this.text = this.pre_text + this.get_value();
        super.update();
    }
}
//popup for help, start, or win? I guess...
export class Popup {
    canvas;
    context;
    children;
    top_left;
    width;
    height;
    type = "popup";
    constructor(canvas) {
        this.canvas = canvas;
        this.context = this.canvas.context;
        //calculate top left, and dimensions
        if (this.canvas.size[0] < 570) {
            this.top_left = [65, 45];
            this.width = this.canvas.size[0] - 130;
            this.height = this.canvas.size[1] - 90;
        }
        else {
            this.top_left = [130, 90];
            this.width = this.canvas.size[0] - 260;
            this.height = this.canvas.size[1] - 180;
        }
        //disable click (will not effect popup members since they don't exist yet)
        this.canvas.components.forEach((component) => {
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
        this.canvas.components.forEach((component) => {
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
        let path = new Path2D();
        if (this.canvas.size[0] < 570) {
            path.rect(this.top_left[0], this.top_left[1], this.width, this.height);
        }
        else {
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
export class Paragraph {
    canvas;
    context;
    text;
    text_color;
    text_font;
    max_width;
    calculated_height;
    coords;
    lines;
    type = "paragraph";
    constructor(canvas, text, text_color, text_font, max_width, coords) {
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
        let current_line = "";
        let words = text.split(" ");
        this.context.font = this.text_font;
        for (let i = 0; i < words.length; i++) {
            let word = words[i];
            current_line += word + " ";
            if (this.context.measureText(current_line.trim()).width > this.max_width) {
                //add current line not including just added word
                this.lines.push(current_line.trim().split(" ").slice(0, -1).join(" "));
                //could break if a single word is larger than the max width -prussia
                current_line = word + " ";
            }
            if (i === words.length - 1) {
                //last word
                this.lines.push(current_line.trim());
            }
        }
        //calculate height (kinda)
        let height = this.context.measureText(this.lines[0]).actualBoundingBoxAscent;
        this.calculated_height = (height + 5) * this.lines.length;
        //add to components
        this.canvas.components.push(this);
    }
    update() {
        //write lines at coords
        this.context.font = this.text_font;
        this.context.fillStyle = this.text_color;
        let height = this.context.measureText(this.lines[0]).actualBoundingBoxAscent;
        for (let i = 0; i < this.lines.length; i++) {
            this.context.fillText(this.lines[i], this.coords[0], this.coords[1] + (height + 5) * i);
        }
    }
}
//Ok fine, it uses video files. But 'Gif' sounds better than 'LoopingVideo' and is shorter too...
export class Gif {
    canvas;
    context;
    video;
    coords;
    width;
    height;
    type = "gif";
    constructor(canvas, video, coords, width, height) {
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
    static video_src_to_video(video_src) {
        let video = document.createElement("VIDEO");
        video.src = video_src;
        video.loop = true;
        return video;
    }
}
