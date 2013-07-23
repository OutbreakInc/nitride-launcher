var fs = require("fs");
var Path = require("path");
var Moduleverse = require("moduleverse");	//Moduleverse.debug(true);
var Config = require("./Config");
var Q = require("noq");
var package = require("./package.json");

__dirname = Path.dirname(unescape(window.location.pathname));

if(__dirname.indexOf(":") > 0)	//Windows has malformed local urls, fix them by lopping off an unneeded slash
	__dirname = __dirname.substr(1);

//identify
var package = require(Path.join(__dirname, "package.json"));
document.title = "Logiblock IDE Launcher " + package.version;

function showUpdateUI()
{
	$("#title").html("Installing updates...");
	$("#updates").show();
}

function showAlert(message)
{
	var $el = $("#alert")
	$(".message", $el).html(message);
	$el.show();
	$("#updates").show();
}


function DownloadProgress($parent, predecessor, owner, moduleName, version)
{
	var owner = owner;
	var moduleName = moduleName;
	var version = version;
	var promise = Q.defer();

	var $line = $('<li><div class="progress progress-striped"><div class="bar" style="width: 100%;"></div></div><h4 class="moduleName"></h4></li>');
	
	var status =
	{
		version: "",
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
		$(".moduleName", $line).html(owner + "/" + moduleName + ' <small>' + status.version + '</small>');
	};
	var uiUpdate = setInterval(render, 500);
	
	var start = function DownloadProgress_start()
	{
		var updater = new Moduleverse.ModuleUpdater(Config.baseDir(), owner, moduleName, version);
		updater.on("version", function(ver)
		{
			status.version = ver;
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

			render();
			showAlert("One or more critical modules need to be installed to start up, and they could not be downloaded.  You must have an internet conenction to update.");
			promise.reject();
		});
	};


	render();

	$parent.append($line);

	predecessor.then(function()
	{
		console.log("starting update for: " + owner + "/" + moduleName);
		start();
	});

	return(promise.promise);
}


function getLatestLocalInstallation($parent, predecessor, owner, moduleName, desiredVersion, moduleNameOverride)
{
	return(Moduleverse.findLocalInstallation(Config.baseDir(), owner, moduleName, desiredVersion, moduleNameOverride)
		.then(function(module)
		{
			if(module == undefined)
			{
				showUpdateUI();
				return(DownloadProgress($parent, predecessor, owner, moduleName, desiredVersion, moduleNameOverride));
			}
			else
				return(module.__path);
		}));
}

var launched = false;
process.on("uncaughtException", function(exception)
{
	if(!launched && console)
	{
		console.warn("Installation error!", exception.stack);
		showAlert("Uncaught exception. Please check the log for details.");
	}
});

$(function()
{
	var $view = $("#updates");
	var $list = $(".list", $view);

	var updates = [];
	var p = Q.defer();

	updates.unshift(getLatestLocalInstallation($list, p.promise, "logiblock", "nitride"));
	updates.unshift(getLatestLocalInstallation($list, updates[0], "logiblock", "platform"));
	updates.unshift(getLatestLocalInstallation($list, updates[0], "logiblock", Config.sdkName()));

	p.resolve();	//kick it off

	Q.all(updates).then(function(dirs)
	{
		$("#title").html("Launching...");

		var mainURL;
		try
		{
			mainURL = require(Path.join(dirs[2], "package.json")).main;
		}
		catch(e)
		{
			showAlert("Could not start the IDE due to an invalid package file.");
		}

		var ideHome = Path.join(dirs[2], mainURL) + "?from=" + escape(window.location) + "&ver=" + package.version;
		console.log("will navigate to: ", ideHome);

		launched = true;
		window.location = ideHome;

	}).fail(function(e)
	{
		$("#title").html("Installation failed!");

		console.warn("Installation error!", e.stack);
		showAlert("There was an internal problem during the installation of updates. Please check the log for details.");
	});
});
