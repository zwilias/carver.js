ImageData.prototype.getPixel = function(x, y) {
	var result = new Object();
	result.r = this.data[(y * (this.width * 4)) + (x*4) + 0];
	result.g = this.data[(y * (this.width * 4)) + (x*4) + 1];
	result.b = this.data[(y * (this.width * 4)) + (x*4) + 2];
	result.a = this.data[(y * (this.width * 4)) + (x*4) + 3];
	
	return result;
}

ImageData.prototype.setPixel = function(pixel, x, y) {
	if (typeof(pixel) == "number") {
		var tmp = new Object();
		tmp.r = pixel;
		tmp.g = pixel;
		tmp.b = pixel;
		tmp.a = 255;
		pixel = tmp;
	}
	
	this.data[(y * (this.width * 4)) + (x*4) + 0] = pixel.r;
	this.data[(y * (this.width * 4)) + (x*4) + 1] = pixel.g;
	this.data[(y * (this.width * 4)) + (x*4) + 2] = pixel.b;
	this.data[(y * (this.width * 4)) + (x*4) + 3] = pixel.a;
}

var img = new Image();

img.onload = function() {
	var canvas = document.getElementById("carver");
	var context = canvas.getContext("2d");
	canvas.width = img.width;
	canvas.height = img.height;
	
	context.drawImage(img, 0, 0);
	
	var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
	for (var y = 0; y < img.height; y++) {
		for (var x = 0; x < img.width; x++) {
			var pixel = imageData.getPixel(x, y);
			var c = (pixel.r + pixel.g + pixel.b)/3;
			imageData.setPixel(c, x, y);
		}
	}
	
	context.putImageData(imageData, 0, 0);
}

img.src = 'tower.png';