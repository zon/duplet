var async = require('async')
var fs = require('fs-extra')
var path = require('path')
var crypto = require('crypto')
var gutil = require('gulp-util')
var Walker = require('walker')
var chokidar = require('chokidar')

var compare = function(a, b) {
	if (fs.existsSync(a)) {
		var stat = fs.lstatSync(a)

		if (stat.isFile()) {
			if (!fs.existsSync(b)) {
				createFile(a, b)
			} else if (
				stat.mtime > fs.statSync(b).mtime &&
				checksum(a) != checksum(b)
			) {
				changeFile(a, b)
			}

		} else if (stat.isDirectory()) {
			if (!fs.existsSync(b)) {
				createDir(b)
			}
		}
	}
}

var checksum = function(f) {
	var hash = crypto.createHash('sha1')
	hash.update(fs.readFileSync(f))
	return hash.digest('hex')
}

var createFile = function(a, b) {
	fs.copySync(a, b)
	gutil.log(gutil.colors.green(
		"create: " + relativePath(a) + " > " + relativePath(b)
	))
}

var changeFile = function(a, b) {
	fs.copySync(a, b)
	gutil.log(gutil.colors.green(
		"change: " + relativePath(a) + " > " + relativePath(b)
	))
}

var remove = function(a, b) {
	setTimeout(function() {
		if (!fs.existsSync(a) && fs.existsSync(b)) {
			fs.removeSync(b)
			gutil.log(gutil.colors.green("remove: " + relativePath(b)))
		}
	}, 250)
}

var createDir = function(d) {
	fs.mkdirsSync(d)
	gutil.log(gutil.colors.green("create: " + relativePath(d)))
}

var relativePath = function(p) {
	return path.relative(process.cwd(), p)
}

// merge prexisting files
var mergeExisting = function(dir, ignored, getOther, callback) {
	var walk = function(p, stat) {
		if (ignored && !ignored.test(p)) {
			compare(p, getOther(p))
		}
	}
	Walker(dir)
		.on('dir', walk)
		.on('file', walk)
		.on('error', callback)
		.on('end', callback)
}

// watch for changes and merge
var watchMerge = function(dirs, ignored, getOther) {
	var merge = function(a, stat) {
		compare(a, getOther(a))
	}
	var rm = function(a) {
		remove(a, getOther(a))
	}
	return chokidar.watch(dirs, {ignored: ignored, persistent: true})
		.on('add', merge)
		.on('addDir', merge)
		.on('change', merge)
		.on('unlink', rm)
		.on('unlinkDir', rm)
		.on('error', function(err) {
			console.error(err)
		})
}

var duplet = function(src, dst, ignored) {
	var srcDir = path.resolve(src)
	var dstDir = path.resolve(dst)

	var getOther = function(p) {
		if (p.lastIndexOf(srcDir, 0) === 0) {
			return dstDir + p.slice(srcDir.length)
		} else if (p.lastIndexOf(dstDir, 0) === 0) {
			return srcDir + p.slice(dstDir.length)
		} else {
			throw new Error("Path isn't in source or destination: "+ p)
		}
	}
	
	var paths = [srcDir, dstDir]
	async.eachSeries(paths, function(dir, cb) {
		mergeExisting(dir, ignored, getOther, cb)
		
	}, function(err) {
		if (err) return console.error(err);
		watchMerge(paths, ignored, getOther)
	})
}

duplet.push = function(src, dst, ignored) {
	var srcDir = path.resolve(src)
	var dstDir = path.resolve(dst)

	var getOther = function(p) {
		var o = p.replace(srcDir, dstDir)
		if (o == p) {
			console.log("Path isn't in source: "+ p)
			throw new Error("Path isn't in source: "+ p)
		} else
			return o
	}

	mergeExisting(srcDir, ignored, getOther, function(err) {
		if (err) return console.error(err);
		watchMerge([srcDir], ignored, getOther)
	})
}

module.exports = duplet