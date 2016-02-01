'use strict';

// Dependencies
//
var fs 		= require('fs');
var mime    = require('mime');
var path 	= require('path');
var gui     = require('nw.gui');
var _       = require('lodash');
var sizeOf = require('image-size');

var photoData = null;

var result = {};
var result_path = "";

var getNextWidth = null;
var mk_getNextWidth = function(max_width) {
	var widths = [];
	for (var i = 0; i < 4; ++i) {
		if (max_width > 0) {
			widths.push(max_width);
			max_width = Math.floor(max_width * 0.8);
		}
	}
	widths.reverse();

	var current_idx = 0;

	return function(bigger) {
		current_idx = bigger ? current_idx + 1 : current_idx - 1;
		current_idx = Math.max(current_idx, 0);
		current_idx = Math.min(current_idx, widths.length - 1);

		return widths[current_idx];
	}
};

function openFolderDialog (cb) {
	var inputField = document.querySelector('#folderSelector');
	inputField.addEventListener('change', function () {
		var folderPath = this.value;
		cb(folderPath);
	});
	inputField.click();
}



function bindSelectFolderClick (cb) {
	var button = document.querySelector('#select_folder');
	button.addEventListener('click', function () {
		openFolderDialog(cb);
	});
}



function hideSelectFolderButton () {
	var button = document.querySelector('#select_folder');
	button.style.display = 'none';	
}



function findAllFiles (folderPath, cb) {
	fs.readdir(folderPath, function (err, files) {
		if (err) { return cb(err, null); }
		cb(null, files);
	});
}



var imageMimeTypes = [
	'image/bmp',
	'image/gif',
	'image/jpeg',
	'image/png',
	'image/pjpeg',
	'image/tiff',
	'image/webp',
	'image/x-tiff',
	'image/x-windows-bmp'
];



function findImageFiles (files, folderPath, cb) {
	var imageFiles = [];
	files.forEach(function (file) {
		var fullFilePath = path.resolve(folderPath,file);
		var extension = mime.lookup(fullFilePath);
		if (imageMimeTypes.indexOf(extension) !== -1) {
			imageFiles.push({name: file, path: fullFilePath});
		}
		if (files.indexOf(file) === files.length-1) {
			cb(imageFiles);
		}
	});
}

function addImageToPhotosArea (file, index) {
	var photosArea = document.getElementById('photos');
	var template = document.querySelector('#photo-template');
	template.content.querySelector('img').src = 'images/blank.png';
	template.content.querySelector('img').setAttribute('data-echo', file.path);
	template.content.querySelector('img').setAttribute('data-name',file.name);
	template.content.querySelector('div').setAttribute('data-index',index);
	// template.content.querySelector('a').setAttribute('href', '#' + index);
	var clone = window.document.importNode(template.content, true);
    photosArea.appendChild(clone);
}

function displayPhotoInFullView (photo) {
	var filePath = photo.querySelector('img').src;
	var fileName = photo.querySelector('img').attributes[1].value;
	document.querySelector('#fullViewPhoto > img').src = filePath;
	document.querySelector('#fullViewPhoto > img').setAttribute('data-name', fileName);
	document.querySelector('#fullViewPhoto').style.display = 'block';
}



var filters = {
	original: function (item) {},

	grayscale: function (item) {
		item.saturation(-100);
		item.render();
	},
	sepia: function (item) {
		item.saturation(-100);
		item.vibrance(100);
		item.sepia(100);
		item.render();
	}, 
	sunburst: function (item) {
		item.brightness(21);
		item.vibrance(22);
		item.contrast(11);
		item.saturation(-18);
		item.exposure(18);
		item.sepia(17);
		item.render();
	},
	port: function (item) {
		item.vibrance(49);
		item.hue(6);
		item.gamma(0.6);
		item.stackBlur(2);
		item.contrast(11);
		item.saturation(19);
		item.exposure(2);
		item.noise(2);
		item.render();
	}
};



function applyFilter (filterName) {
	Caman('#image', function () {
		this.reset();
		filters[filterName](this);
	});
}



function bindSavingToDisk () {
	var photoSaver 	= document.querySelector('#photoSaver');
	photoSaver.addEventListener('change', function () {
		var filePath = this.value;
		fs.writeFile(filePath, photoData, 'base64', function (err) {
			if (err) { alert('There was an error saving the photo:',err.message); }
			photoData = null;
		});
	});
}



function saveToDisk () {
	var photoSaver 	= document.querySelector('#photoSaver');
	var canvas 		= document.querySelector('canvas');
	photoSaver.setAttribute('nwsaveas','Copy of ' + canvas.attributes['data-name'].value);
	photoData 		= canvas.toDataURL('image/png').replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
	photoSaver.click();
}



function backToGridView () {
	var canvas 	= document.querySelector('canvas');
	if (canvas) {
		var image 	= document.createElement('img');
		image.setAttribute('id','image');
		canvas.parentNode.removeChild(canvas);
		var fullViewPhoto = document.querySelector('#fullViewPhoto');
		fullViewPhoto.insertBefore(image, fullViewPhoto.firstChild);		
	}
	document.querySelector('#fullViewPhoto').style.display = 'none';
}

var makeCircle = function(left, top, index) {
    var circle = $('<div />', {
    	class : 'circle'
    });

    circle.css({
    	left : 'calc(' + Math.round(left * 100) + '% - 5px)', 
    	top  : 'calc(' + Math.round(top * 100)  + '% - 5px)'
    });

    circle.on('click', function(e) {
    	circle.remove();
    	e.stopPropagation();

    	var op_str = [
    		'r',
    		index,
    		left,
    		top
	   	].join(',');

	   	console.log(op_str);
	   	console.log(result_path);
	    fs.appendFile(result_path, op_str + '\n');
    });

    return circle;
};

function bindClickingOnAPhoto (photo, circles, index) {
	// photo.ondblclick = function () {
	// 	displayPhotoInFullView(photo);
	// };


	// var index = $(this).data('index');

	circles.forEach(function(c) {
		var circle = makeCircle(c.left, c.top, index);	
	    $(photo).append(circle);
	});

	photo.onclick = function (e) {

		console.log(index);

		var offset = $(this).offset();
		var position = (e.pageX - offset.left) + " " + (e.pageY - offset.top);

	    var left = e.pageX - offset.left;
	    var top  = e.pageY - offset.top;

	    console.log('left: ' + left);
	    console.log('width: ' + document.querySelector('img').width);

	    left = left / document.querySelector('img').width;
	    top  = top / document.querySelector('img').height;
	    console.log('percent: ' + left);

		var circle = makeCircle(left, top, index);

	    $(photo).append(circle);

	    var op_str = [
	    	'a',
	    	index,
	    	left,
	    	top
	   	].join(',')

	    fs.appendFile(result_path, op_str + '\n');

	    // console.log($(this));
	    // console.log($(this).data('index'));
	};
}

function bindClickingOnAllPhotos (map_by_index) {
	var photos = document.querySelectorAll('.photo');

	for (var i = 0; i < photos.length; i++) {
		var photo = photos[i];

		var circles = [];
		if (i in map_by_index) {
			circles = map_by_index[i];
		}
		bindClickingOnAPhoto(photo, circles, i);
	}

	console.log('min_width: ' + min_width);
}



function clearArea () {
	document.getElementById('photos').innerHTML = '';
}



// function loadAnotherFolder () {
// 	openFolderDialog(function (folderPath) {		
// 		findAllFiles(folderPath, function (err, files) {
// 			if (!err) {
// 				clearArea();
// 				echo.init({
// 					offset: 0,
//      				throttle: 0,
// 	     			unload: false
// 				});
// 				findImageFiles(files, folderPath, function (imageFiles) {
// 					imageFiles.forEach(function (file, index) {
// 						addImageToPhotosArea(file, index);
// 						if (index === imageFiles.length-1) {
// 							echo.render();
// 							bindClickingOnAllPhotos();
// 							bindSavingToDisk();
// 						}
// 				    });
// 				});
// 			}
// 		});
// 	});
// }



function loadMenu () {
	var menuBar 	= new gui.Menu({type:'menubar'});
	var menuItems 	= new gui.Menu();

	// menuItems.append(new gui.MenuItem({ label: 'Load another folder', click: loadAnotherFolder }));

	var fileMenu = new gui.MenuItem({
		label: 'File',
		submenu: menuItems
	});

	if (process.platform === 'darwin') {

		// Load Mac OS X application menu
		menuBar.createMacBuiltin('Lens');
		menuBar.insert(fileMenu, 1);

	} else {

		// Load Windows/Linux application menu
		menuBar.append(fileMenu, 1);

	}

	gui.Window.get().menu = menuBar;

}


// Runs when the browser has loaded the page
//
window.onload = function () {

    echo.init({
		offset: 0,
     	throttle: 0,
     	unload: false
	});

	bindSelectFolderClick(function (folderPath) {

		result_path 		 = path.join(folderPath, "_result.txt");
		var last_result_path = path.join(folderPath, "$result.txt");

		fs.rename(result_path, last_result_path, function() {
			fs.readFile(last_result_path, function(err, data) {

				var result_map = {};

				if (err == null) {
					result = data.toString().split('\n');
					result.forEach(function(line) {
						if (line == '')
							return;
						var parts = line.split(',');
						if (parts.length != 4)
							return;

						console.log(parts);

						var key 	= parts.slice(1).join('-');
						var action 	= parts[0];

						if (action == 'a') {
							result_map[key] = {
								index : parts[1],
								left  : parts[2],
								top   : parts[3]
							}
						} else if (action == 'r') {
							delete result_map[key];
						}
					});
				}
				
				console.log(result_map);

				var result_arr = Object.keys(result_map).map(function(key) {
					return result_map[key];
				});

				result_arr.sort(function(a, b) {
					if (a.index > b.index) return 1;
					if (a.index < b.index) return -1;
					return 0;
				}).forEach(function(o) {
					var op_str = [
						'a',
						o.index,
						o.left,
						o.top
					];

					fs.appendFile(result_path, op_str + '\n');
				});

				var map_by_index = _.groupBy(result_arr, function(o) {
					return o.index;
				});

				loadMenu();
				hideSelectFolderButton();
				findAllFiles(folderPath, function (err, files) {
					if (!err) {
						findImageFiles(files, folderPath, function (imageFiles) {

							var dimensions = sizeOf(imageFiles[0].path);

							getNextWidth = mk_getNextWidth(dimensions.width);

							imageFiles.forEach(function (file, index) {
								addImageToPhotosArea(file, index);
								if (index === imageFiles.length-1) {
									echo.render();
									bindClickingOnAllPhotos(map_by_index);
									bindSavingToDisk();
								}
						    });
						});
					}
				});
			});
		});
	});

	var mouseWheel = function(e)
	{
	    // disabling
	    e =e ? e : window.event;
	    // if(e.ctrlKey)
	    if (e.shiftKey)
	    {
	        if(e.preventDefault)
	        	e.preventDefault();
	        else 
	        	e.returnValue=false;

	        var width = getNextWidth(e.wheelDelta > 0);

	        $(".photo").css({
	        	width : width + 'px'
	        });

			console.log(width);

	        return false;
	    }
	}

	document.body.addEventListener("mousewheel",mouseWheel,false);
};
