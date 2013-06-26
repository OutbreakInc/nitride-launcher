var Moduleverse = require("moduleverse");	//Moduleverse.debug(true);
var Config = require("./Config");
var Q = require("q");

_.templateSettings =
{
	evaluate: /\{\{:(.+?)\}\}/g,
	interpolate: /\{\{([^:].+?)\}\}/g,
	escape: /\{\{\{(.+?)\}\}\}/g
};

function DownloadProgress($parent, predecessor, owner, moduleName, version)
{
	var owner = owner;
	var moduleName = moduleName;
	var version = version;
	var promise = Q.defer();

	var $line = $('<li><div class="progress progress-striped"><div class="bar" style="width: 100%;"></div></div><h3 class="moduleName"></h3></li>');
	
	var status =
	{
		progress: undefined,
		file: ""
	};
	
	var render = function()
	{
		if(status.progress !== undefined)
		{
			$("div.progress-striped", $line).removeClass("progress-striped");
			$("div.bar", $line).css("width", (status.progress * 100).toFixed(0) + "%");
		}
		$(".lastFile", $line).html(status.file);
	};
	var uiUpdate = setInterval(render, 500);
	
	var start = function DownloadProgress_start()
	{
		var updater = new Moduleverse.ModuleUpdater(Config.baseDir(), owner, moduleName, version);
		updater.on("version", function(ver)
		{
			//status.version = ver;	//@@not supported yet
		})
		.on("progress", function(loaded, total)
		{
			status.progress = ((loaded / total) || 0);
		})
		.on("file", function(file)
		{
			status.file = file;
		}).promise.then(function(dir)
		{
			clearInterval(uiUpdate);

			console.log("update complete for: " + owner + "/" + moduleName);
			$("div.bar", $line).addClass("bar-success");
			status.progress = 1;
			render();
			
			promise.resolve(dir);
		},
		function()	//fail
		{
			console.warn("failed to locate or update module: " + owner + "/" + moduleName);
			$(".lastFile", $line).html("<em>error!</em>");
			$("div.bar", $line).addClass("bar-danger");
			clearInterval(uiUpdate);
			promise.reject();
		});
	};


	$(".moduleName", $line).html(owner + "/" + moduleName);

	$parent.append($line);

	predecessor.then(function()
	{
		console.log("starting update for: " + owner + "/" + moduleName);
		start();
	});

	return(promise.promise);
}


$(function()
{
	var $view = $("#updates");
	var $list = $(".list", $view);

	var updates = [];
	var p = Q.defer();
	updates.unshift(DownloadProgress($list, p.promise, "logiblock", "nitride"));
	updates.unshift(DownloadProgress($list, updates[0], "logiblock", "platform"));
	updates.unshift(DownloadProgress($list, updates[0], "logiblock", Config.sdkName()));

	p.resolve();	//kick it off

	Q.all(updates).then(function(dirs)
	{
		var ideHome = dirs[2] + "/IDE.html";
		console.log("set complete, would navigate to: ", ideHome);

		setTimeout(function()
		{
			//go!
			window.location = ideHome;
		}, 500);
	});
});
