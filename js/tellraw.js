const chars = [1,2,3,4,5,6,7,8,9,0,'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
let matchLength = 0;
const version = 4;
const tos_version = 1;
const notice = {
	"show": false,
	"id": 8,
	"message": {
		"title": "Updated...",
		"text": "Hi",
		"type": "info"
	}
};
let jobject = [];
let selectedHover;
let selectedClick;
let selectedHover_edit;
let selectedClick_edit;
let downButton;
let upButton;
let extraTextFormat = 'raw';
let lang = {};
let currentEdit;
let hasAlertedTranslationObjects = false;
let defaultLanguage = 'en-US';
let languageCodes = [defaultLanguage];
let webLangRelations;
let editing = false;
let issueLog = [];
let bookPage = 1;
let topPage = 1;
let embed = false;

/***************************/
/* Local Storage Interface */
/***************************/

let lsm = {
	enabled: false,
	storage: {},
	setItem(key, value) {
		try {
			localStorage.setItem(key, value);
		} catch(e) {
			lsm.enabled = true;
			lsm.storage[key] = value;
		}
	},
	getItem(key) {
		if (lsm.enabled) {
			return lsm.storage[key];
		} else {
			return localStorage.getItem(key);
		}
	},
	clear() {
		if (lsm.enabled) {
			lsm.storage = {};
		} else {
			localStorage.clear();
		}
	},
	removeItem(key) {
		if (lsm.enabled) {
			delete lsm.storage[key];
		} else {
			localStorage.removeItem(key);
		}
	},
	dictionary() {
		if (lsm.enabled) {
			return lsm.storage;
		} else {
			return localStorage;
		}
	}
};

/*********************/
/* Utility Functions */
/*********************/

/* http://stackoverflow.com/a/728694/2059595 */
function clone(obj) {
	var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
    	copy = new Date();
    	copy.setTime(obj.getTime());
    	return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
    	copy = [];
    	for (var i = 0, len = obj.length; i < len; i++) {
    		copy[i] = clone(obj[i]);
    	}
    	return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
    	copy = {};
    	for (var attr in obj) {
    		if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
    	}
    	return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

function getURL(url){
	return $.ajax({
		type: "GET",
		url: url,
		cache: false,
		async: false
	}).responseText;
}

/*
(c) 2012 Steven Levithan <http://slevithan.com/>
MIT license
*/
if (!String.prototype.codePointAt) {
	String.prototype.codePointAt = function(pos) {
		pos = isNaN(pos) ? 0 : pos;
		var str = String(this),
		code = str.charCodeAt(pos),
		next = str.charCodeAt(pos + 1);
        // If a surrogate pair
        if (0xD800 <= code && code <= 0xDBFF && 0xDC00 <= next && next <= 0xDFFF) {
        	return ((code - 0xD800) * 0x400) + (next - 0xDC00) + 0x10000;
        }
        return code;
    };
}

function hardFail(message = "An unexpected erorr occurred which cannot be recovered. Please reload or try again later.") {
	alert(message);
	document.getElementsByTagName('body')[0].innerHTML = message + "<br><br>If the issue persists, click <a href=\"https://github.com/ezfe/tellraw/issues\">here</a> to file an issue report";
}

function makeExportString() {
	return JSON.stringify({"command":$('#command').val(),"jobject":jobject,"jtemplate":lsm.getItem('jtemplate')})
}

function importString(oinpt) {
	var inpt = undefined;
	try {
		inpt = JSON.parse(oinpt);
	} catch(err) {
		logIssue(getLanguageString('settings.importtext.exported.failed.header',lsm.getItem('langCode')),getLanguageString('settings.importtext.exported.failed.description',lsm.getItem('langCode')) + ': ' + oinpt,true)
		return false;
	}
	jobject = inpt['jobject'];
	if (inpt['jtemplate']) {
		lsm.setItem('jtemplate',inpt['jtemplate'])
	}
	$('#command').val(inpt['command']);
	return true;
}

/*****************/
/* Issue Reports */
/*****************/

function reportAnIssue(ptitle) {
	var title = "";
	var body = "";
	if (ptitle != undefined) {
		title = `Issue Report - ${ptitle}`;
		body = 'Please enter steps to reproduce the issue below, as well as any other information you want to include%0A%0A%0A%0A%0A%0A Provided Data - Do not modify below this line%0A%0A```%0A' + JSON.stringify(jobject) + '%0A```';
	}
	var win = window.open('http://github.com/ezfe/tellraw/issues/new?body=' + body + '&title=' + title, '_blank');
	win.focus();
}

function showIssue() {
	alert(`${issueLog[issueLog.length - 1].name}\n${issueLog[issueLog.length - 1].data}`);
}

function logIssue(name,data,critical) {
	issueLog.push({"name": name,"data": data});
	if (critical) {
		alert(`${name}\n${data}`);
	}
}

/**********************/
/* Language Utilities */
/**********************/

function getLanguageName(langCode) {
	var name = lang[langCode].language.name;
	if (name == "English" && langCode != 'en-US') {
		return langCode
	} else {
		return name
	}
}

function getLanguageData(langCode) {
	if (lang[langCode] === undefined) {
		return new Promise((resolve, reject) => {
			$.ajax({
				url: `lang/${langCode}.json`,
				type: 'GET',
				dataType: 'json',
				success: languageJSON => {
					resolve(languageJSON);
				},
				error: (request, error) => {
					reject(error);
				}
			});
		});
	} else {
		return new Promise((resolve, reject) => {
			resolve(lang[langCode]);
		});
	}
}

function loadOtherLanguages() {
	for (var i = 0; i < languageCodes.length; i++) {
		let code = languageCodes[i];
		getLanguageData(code).then(data => {
			lang[code] = data;
			refreshLanguage();
		}, err => {
			alert(err);
		});
	}
}

/*****************/
/* View Controls */
/*****************/

function showView(viewname,suppressAnimation,hideOthers,hideMenubar) {
	var hideMenubarOriginal = hideMenubar;
	if (embed) {
		hideMenubar = true;
	}
	var toHide = $('.view-container').not('.view-container[view="' + viewname + '"]');
	if (!hideMenubar) {
		toHide = toHide.not('.view-container[view="pageheader"]');
	}
	var toShow = $('.view-container[view="' + viewname + '"]');
	if (!hideMenubar) {
		$($('.view-container[view="pageheader"]')).show();
	}
	if (hideOthers === false) {
		toHide = $('');
	}
	if (suppressAnimation) {
		toHide.hide();
		toShow.show();
	} else {
		toHide.slideUp();
		toShow.slideDown();
	}
	if (viewname != "loading" && viewname != "pageheader" && viewname != "issue") {
		lsm.setItem('jview',JSON.stringify({"viewname":viewname,"suppressAnimation":suppressAnimation,"hideOthers":hideOthers,"hideMenubar":hideMenubar}));
	}
	if (toShow.length == 0) {
		logIssue('Missing View',viewname,true);
		showView('tellraw');
	}
}

function verify_jobject_format(jdata) {
	var resetError = JSON.stringify({"title": "Object Verification Failed", "text": "An error occured and the page has been reset", "type": "error"});

	if (get_type(jdata) == "[object Object]") {
		if (get_type(jdata.extra) == "[object Array]") {
			jdata = jdata.extra;
		} else {
			sessionStorage.setItem('nextTimeAlert',resetError);
			lsm.clear();
			location.reload();
			return;
		}
	}

	if (get_type(jdata) != "[object Array]") {
		sessionStorage.setItem('nextTimeAlert',resetError);
		lsm.clear();
		location.reload();
		return;
	}

	if (jdata.text != '' && get_type(jdata) != "[object Array]") {
		jdata.unshift(new Object());
		jdata[0].text = jdata.text;
		jdata[0].color = jdata.color;
		delete(jdata.color);
		jdata[0].bold = jdata.bold;
		delete(jdata.bold);
		jdata[0].italic = jdata.italic;
		delete(jdata.italic);
		jdata[0].underlined = jdata.underlined;
		delete(jdata.underline);
		jdata[0].strikethrough = jdata.strikethrough;
		delete(jdata.strikethrough);
		jdata[0].obfuscated = jdata.obfuscated;
		delete(jdata.obfuscated);
		jdata.text = '';
	}

	//Tracks changes for "true" --> true
	var booleanUpdateCount = 0;

	var emptyTextHoverRemoved = 0;

	for (var i = 0; i < jdata.length; i++) {

		//Convert show_text to structured format
		if (jdata[i].hoverEvent != undefined) {
			if (jdata[i].hoverEvent.action == "show_text") {
				if (typeof jdata[i].hoverEvent.value == "object") {
					if (jdata[i].hoverEvent.value.text != "") {
						jdata[i].hoverEvent.value = {"text":"", "extra":[jdata[i].hoverEvent.value]};
					}
					if (jdata[i].hoverEvent.value.extra.length == 0) {
						delete jdata[i].hoverEvent;
						emptyTextHoverRemoved += 1;
					}
				} else if (typeof jdata[i].hoverEvent.value == "string") {
					jdata[i].hoverEvent.value = {"text":"", "extra":[{"text":jdata[i].hoverEvent.value}]};
				}
			}
		}

		if (jdata[i].bold == "true") {
			jdata[i].bold = true;
			booleanUpdateCount++;
		} else if (jdata[i].bold !== true) {
			delete jdata[i].bold;
		}
		if (jdata[i].italic == "true") {
			jdata[i].italic = true;
			booleanUpdateCount++;
		} else if (jdata[i].italic !== true) {
			delete jdata[i].italic;
		}
		if (jdata[i].underlined == "true") {
			jdata[i].underlined = true;
			booleanUpdateCount++;
		} else if (jdata[i].underlined !== true) {
			delete jdata[i].underlined;
		}
		if (jdata[i].strikethrough == "true") {
			jdata[i].strikethrough = true;
			booleanUpdateCount++;
		} else if (jdata[i].strikethrough !== true) {
			delete jdata[i].strikethrough;
		}
		if (jdata[i].obfuscated == "true") {
			jdata[i].obfuscated = true;
			booleanUpdateCount++;
		} else if (jdata[i].obfuscated !== true) {
			delete jdata[i].obfuscated;
		}
	}
	if (booleanUpdateCount > 0) {
		alert(`All strings representing boolean values have been updated to true/false values (${booleanUpdateCount} change${(booleanUpdateCount == 1 ? "" : "s")})`);
	}

	if (emptyTextHoverRemoved > 0) {
		alert(emptyTextHoverRemoved + " empty text hoverevent(s) were removed because Minecraft cannot handle these");
	}

	return jdata;
}

function strictifyItem(job, index) {
	var joi = job[index];
	if (index == 0 || job[index - 1].NEW_ITERATE_FLAG || job[index].NEW_ITERATE_FLAG) {
		return joi;
	}
	var prejoi = job[index - 1];

	for (var i = 0; i < Object.keys(prejoi).length; i++) {
		var key = Object.keys(prejoi)[i];
		var doNotCheckKeys = ["text", "score", "selector", "color", "clickEvent", "hoverEvent", "insertion"]
		if (doNotCheckKeys.indexOf(key) == -1) {
			if (prejoi[key] === true && joi[key] === undefined) {
				joi[key] = false;
			}
		} else {
			if (key == "color") {
				if (joi["color"] === undefined) {
					joi["color"] = noneName();
				}
			}

			continue;
		}
	}

	return joi;
}

function strictifyJObject(job) {
	for (var x = 0; x < job.length; x++) {
		job[x] = strictifyItem(job,x);
	}
	return job;
}

function formatJObjectList(d) {
	data = strictifyJObject(clone(d));

	if (data.length == 0) {
		return [];
	}
	var ret_val = [];
	var currentDataToPlug = [""];
	for (var i = 0; i < data.length; i++) {
		if (data[i].NEW_ITERATE_FLAG) {
			ret_val.push(JSON.stringify(currentDataToPlug));
			currentDataToPlug = [""];
		} else {
			currentDataToPlug.push(data[i]);
		}
	}
	if (!data[data.length - 1].NEW_ITERATE_FLAG) {
		ret_val.push(JSON.stringify(currentDataToPlug));
	}
	return ret_val;
}

function closeExport() {
	$('#exporter').remove();
}

function isScrolledIntoView(elem) {
	elem = '#' + elem;
	var docViewTop = $(window).scrollTop();
	var docViewBottom = docViewTop + $(window).height();

	var elemTop = $(elem).offset().top;
	var elemBottom = elemTop + $(elem).height();

	return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
}

function goToByScroll(id){
	if (!isScrolledIntoView(id)) {
		$('html,body').animate({scrollTop: $("#"+id).offset().top},'slow');
	}
}

const MOUSE_ACTION_HOVER = "MA_HOVER";
const MOUSE_ACTION_CLICK = "MA_CLICK";
const MOUSE_ACTION_INSERTION = "MA_INSERTION";
let templates =
{
	"tellraw": {
		"command": "/tellraw @p %s",
		"version": "1.7",
		"formatType": "standardjson",
		"mouseActionOptions": [MOUSE_ACTION_HOVER, MOUSE_ACTION_CLICK, MOUSE_ACTION_INSERTION]
	},
	"execute_tellraw": {
		"command": "/execute @a ~ ~ ~ tellraw @p %s",
		"version": "1.8",
		"formatType": "standardjson",
		"mouseActionOptions": [MOUSE_ACTION_HOVER, MOUSE_ACTION_CLICK, MOUSE_ACTION_INSERTION]
	},
	"title": {
		"command": "/title @a title %s",
		"version": "1.8",
		"formatType": "standardjson",
		"mouseActionOptions": []
	},
	"subtitle": {
		"command": "/title @a subtitle %s",
		"version": "1.8",
		"formatType": "standardjson",
		"mouseActionOptions": []
	},
	"actionbar": {
		"command": "/title @a actionbar %s",
		"version": "1.11",
		"formatType": "standardjson",
		"mouseActionOptions": []
	},
	"sign_item": {
		"command": "/give @p sign 1 0 {BlockEntityTag:{%s,id:\"Sign\"}}",
		"version": "1.8",
		"formatType": "signset",
		"mouseActionOptions": []
	},
	"sign_block": {
		"command": "/blockdata [x] [y] [z] {%s}",
		"version": "1.8",
		"formatType": "signset",
		"mouseActionOptions": []
	},
	"book": {
		"command": "/give @p written_book 1 0 {pages:%s,title:Book,author:TellrawGenerator}",
		"version": "1.8",
		"formatType": "bookarray",
		"mouseActionOptions": [MOUSE_ACTION_HOVER, MOUSE_ACTION_CLICK, MOUSE_ACTION_INSERTION]
	}
}

function setObfuscatedString(string) {
	var output = "";
	for (var i = string.length - 1; i >= 0; i--) {
		if (string[i] != " ") {
			output = output + chars[Math.floor(Math.random() * chars.length)];
		} else {
			output += " ";
		}
	};
	return output;
}
function deleteAll() {
	let head = getLanguageString('settings.deleteall.heading',lsm.getItem('langCode'));
	let body = getLanguageString('settings.deleteall.body',lsm.getItem('langCode'));
	if (confirm(`${head}\n${body}`)) {
		jobject = [];
		$('.templateButton[template=tellraw]').click();
		refreshOutput();
		refreshLanguage();
	}
}

function obfuscationPreviewHandler() {
	$('.jsonPreviewObfuscated').html(setObfuscatedString($('.jsonPreviewObfuscated').html()));
	if ($('.jsonPreviewObfuscated').length > 0) {
		setTimeout(obfuscationPreviewHandler, 20);
	}
}

function currentTemplate() {
	return templates[lsm.getItem('jtemplate')];
}

function noneHex() {
	if (currentTemplate().formatType == 'bookarray' || currentTemplate().formatType == 'signset') {
		return '#000000';
	} else {
		return '#FFFFFF'
	}
}

function noneName() {
	return 'none';
	/* I think none is the proper name */
	// if (currentTemplate().formatType == 'bookarray' || currentTemplate().formatType == 'signset') {
	// 	return 'black';
	// } else {
	// 	return 'white'
	// }
}

function getCSSHEXFromWord(w) {
	if (w == "black") return("#000000");
	if (w == "dark_blue") return("#0000B2");
	if (w == "dark_green") return("#14AB00");
	if (w == "dark_aqua") return("#13AAAB");
	if (w == "dark_red") return("#A90400");
	if (w == "dark_purple") return("#A900B2");
	if (w == "gold") return("#FEAC00");
	if (w == "gray") return("#AAAAAA");
	if (w == "dark_gray") return("#555555");
	if (w == "blue") return("#544CFF");
	if (w == "green") return("#5CFF00");
	if (w == "aqua") return("#5BFFFF");
	if (w == "red") return("#FD5650");
	if (w == "light_purple") return("#FD4DFF");
	if (w == "yellow") return("#FFFF00");
	if (w == "white") return("#FFFFFF");
	if (w == "none") return(noneHex());
	return noneHex();
}
function removeWhiteSpace(s) {
	return s;
	//BROKEN return s.replace(/ /g, '');
}
function deleteIndex(index) {
	jobject.splice(index, 1);
	refreshOutput();
}
function moveUp(index) {
	jobject.splice(index+1, 0, jobject.splice(index, 1)[0]);
	refreshOutput();
}
function fly(index) {
	var moveTo = prompt("Enter new location (0-"+jobject.length+")");
	if (moveTo > jobject.length) {
		moveTo = jobject.length;
	}
	jobject.splice(moveTo, 0, jobject.splice(index, 1)[0]);
	refreshOutput();
}
function getSelected(object) {
	if ($('#'+object).length != 0) {
		var e = document.getElementById(object);
		return e.options[e.selectedIndex].value;
	} else {
		return false;
	}
}
function getSelectedIndex(object) {
	var e = document.getElementById(object);
	return e.selectedIndex;
}
function getChecked(id) {
	return document.getElementById(id).checked;
}
function clearExtra() {
	$('#fmtExtraRaw').click();
	$("#clickEventText").val("");
	$("#hoverEventText").val("");
	$("#hoverEventValue").val("");
	$("#hoverEventTextSnippet").val("");
	$("#snippetcolor").val("none");
	$('#snippetcolor').change();
	$("#text_extra").val("");
	$("#color_extra").val("none");
	$("#clickEvent").val('none');
	$("#hoverEvent").val('none');
	$("#insertion_text").val('');
	$("#bold_text_extra").prop("checked",false);
	$("#italic_text_extra").prop("checked",false);
	$("#underlined_text_extra").prop("checked",false);
	$("#strikethrough_text_extra").prop("checked",false);
	$("#obfuscated_text_extra").prop("checked",false);
	$('#hoverEventEntityName').val('');
	$('#hoverEventEntityID').val('');
	$('#hoverEventEntityType').val('');
	$('#textsnippets_add').html(getLanguageString('textsnippets.addsnippet', lsm.getItem('langCode')));
	$('#textsnippets-add-button').addClass('btn-default');
	$('#textsnippets-add-button').removeClass('btn-danger');
	$('#obj_player').val('');
	$('#obj_score').val('');
	$('#text_extra_container').removeClass('has-error');
	refreshOutput();
}
function editExtra(index) {
	editing = true;
	$('#snippetsWell').hide();
	$('#editModalData').show();

	currentEdit = index;

	if (jobject[index].text != undefined) {
		$('#obj_extra_container_edit').hide();
		$('#text_extra_container_edit').show();
		$('#translate_selector_container_edit').hide();
		$('#selector_extra_container_edit').hide();
		$('#text_extra_edit').val(jobject[index].text);
	} else if (jobject[index].selector != undefined) {
		$('#obj_extra_container_edit').hide();
		$('#selector_extra_container_edit').show();
		$('#text_extra_container_edit').hide();
		$('#translate_selector_container_edit').hide();
		$('#selector_edit').val(jobject[index].selector);
	} else if (jobject[index].translate != undefined) {
		$('#obj_extra_container_edit').hide();
		$('#text_extra_container_edit').hide();
		$('#selector_extra_container_edit').hide();
		$('#translate_selector_container_edit').show();
		if (!hasAlertedTranslationObjects) {
			alert("Translation objects are currently broken and may crash your game.\nPlease test your translation before publishing it.");
			hasAlertedTranslationObjects = true;
		}
	} else if (jobject[index].score != undefined) {
		$('#obj_extra_container_edit').show();
		$('#text_extra_container_edit').hide();
		$('#translate_selector_container_edit').hide();
		$('#selector_extra_container_edit').hide();
		$('#obj_player_edit').val(jobject[index].score.name);
		$('#obj_score_edit').val(jobject[index].score.objective);
	}

	refreshLanguage();

	$('#colorPreviewColor_edit').css('background-color',getCSSHEXFromWord(jobject[index].color));
	if (jobject[index].color != undefined) {
		$("#color_extra_edit").val(jobject[index].color);
	} else {
		$("#color_extra_edit").val('none');
	}

	if (jobject[index].bold != undefined) {
		$('#bold_text_extra_edit').prop('checked',true);
	} else {
		$('#bold_text_extra_edit').prop('checked',false);
	}
	if (jobject[index].italic != undefined) {
		$('#italic_text_extra_edit').prop('checked',true);
	} else {
		$('#italic_text_extra_edit').prop('checked',false);
	}
	if (jobject[index].underlined != undefined) {
		$('#underlined_text_extra_edit').prop('checked',true);
	} else {
		$('#underlined_text_extra_edit').prop('checked',false);
	}
	if (jobject[index].strikethrough != undefined) {
		$('#strikethrough_text_extra_edit').prop('checked',true);
	} else {
		$('#strikethrough_text_extra_edit').prop('checked',false);
	}
	if (jobject[index].obfuscated != undefined) {
		$('#obfuscated_text_extra_edit').prop('checked',true);
	} else {
		$('#obfuscated_text_extra_edit').prop('checked',false);
	}

	if (jobject[index].clickEvent != undefined) {
		$('#clickEvent_edit').val(jobject[index].clickEvent.action);
		$('#clickEventText_edit').val(jobject[index].clickEvent.value);
	} else {
		$('#clickEvent_edit').val('none');
		$('#clickEventText_edit').val('');
	}


	if (jobject[index].hoverEvent != undefined) {
		$('#hoverEvent_edit').val(jobject[index].hoverEvent.action);
		if ($('#hoverEvent_edit').val() != 'show_entity') {
			if (jobject[index].hoverEvent.action == 'show_text') {
				$('#hoverEventText_edit').val(JSON.stringify(jobject[index].hoverEvent.value));
			} else {
				$('#hoverEventText_edit').val(jobject[index].hoverEvent.value);
			}
		} else {
			$('#hoverEventEntityID_edit').val(jobject[index].hoverEvent.value.match(/id:([a-zA-Z0-9]+)/g )[0].replace('id:',''));
			$('#hoverEventEntityName_edit').val(jobject[index].hoverEvent.value.match(/name:([a-zA-Z0-9]+)/g )[0].replace('name:',''));
			$('#hoverEventEntityType_edit').val(jobject[index].hoverEvent.value.match(/type:([a-zA-Z0-9]+)/g )[0].replace('type:',''));
		}
	} else {
		$('#hoverEvent_edit').val('none');
		$('#hoverEventText_edit').val('');
	}

	if (jobject[index].insertion != undefined) {
		$('#insertion_text_edit').val(jobject[index].insertion);
	}

	refreshOutput();
}
function cancelExtraEdit() {
	$('#editModalData').hide();
	$('#snippetsWell').show();
}
function saveExtraEdit() {
	editing = false;
	extraIndex = currentEdit;
	jobject[extraIndex].color = getSelected("color_extra_edit");

	if (jobject[extraIndex].color == 'none') {
		delete jobject[extraIndex].color;
	}

	if ($('#obj_extra_container_edit').is(":visible")) {
		jobject[extraIndex].score = new Object;
		jobject[extraIndex].score.name = $('#obj_player_edit').val();
		jobject[extraIndex].score.objective = $('#obj_score_edit').val();
	} else if ($('#text_extra_container_edit').is(":visible")) {
		jobject[extraIndex].text = $('#text_extra_edit').val();
	} else if ($('#selector_extra_container_edit').is(":visible")) {
		jobject[extraIndex].selector = $('#selector_edit').val();
	} else if ($('#translate_selector_container_edit').is(":visible")) {
		jobject[extraIndex].translate = $('#translate_input_edit').val();
		if (matchLength != 0) {
			if (get_type(jobject.with) != "[object Array]") {
				jobject[extraIndex].with = new Array();
			}
			for (var i = 0; i < matchLength; i++) {
				jobject[extraIndex].with[i] = $('#extraTranslationParameter'+i+'_edit').val();
			};
		}
	} else {
		alert('An unexpected error occured.');
	}

	delete jobject[extraIndex].bold;
	delete jobject[extraIndex].italic;
	delete jobject[extraIndex].underlined;
	delete jobject[extraIndex].strikethrough;
	delete jobject[extraIndex].obfuscated;

	if (getChecked("bold_text_extra_edit")) {
		jobject[extraIndex].bold = true;
	}
	if (getChecked("italic_text_extra_edit")) {
		jobject[extraIndex].italic = true;
	}
	if (getChecked("underlined_text_extra_edit")) {
		jobject[extraIndex].underlined = true;
	}
	if (getChecked("strikethrough_text_extra_edit")) {
		jobject[extraIndex].strikethrough = true;
	}
	if (getChecked("obfuscated_text_extra_edit")) {
		jobject[extraIndex].obfuscated = true;
	}

	delete jobject[extraIndex].clickEvent;
	delete jobject[extraIndex].hoverEvent;

	var clickEventType_edit = $("#clickEvent_edit").val();
	var hoverEventType_edit = $("#hoverEvent_edit").val();

	if (clickEventType_edit != "none") {
		jobject[extraIndex].clickEvent = new Object();
		jobject[extraIndex].clickEvent.action = clickEventType_edit;
		jobject[extraIndex].clickEvent.value = $('#clickEventText_edit').val();
		if (clickEventType_edit == "run_command" || clickEventType_edit == "suggest_command") {
			if ($('#clickEventText_edit').val().length > 256) {
				alert('Commands cannot be longer than 256 characters!\nYou should edit the length of your command before using this in game.');
			}
		}
	}
	if (hoverEventType_edit != "none") {
		jobject[extraIndex].hoverEvent = new Object();
		jobject[extraIndex].hoverEvent.action = hoverEventType_edit;
		if (hoverEventType_edit == 'show_text') {
			try {
				jobject[extraIndex].hoverEvent.value = JSON.parse($('#hoverEventText_edit').val());
			} catch(err) {
				jobject[extraIndex].hoverEvent.value = {"text":"","extra":[{"text":$('#hoverEventText_edit').val()}]};
			}
		} else {
			jobject[extraIndex].hoverEvent.value = $('#hoverEventText_edit').val();
		}
	}
	if (hoverEventType_edit == "show_entity") {
		if ($('#hoverEventEntityID_edit').val() == '') {
			$('#hoverEventEntityID_edit').val('(ID)')
		}
		if ($('#hoverEventEntityName_edit').val() == '') {
			$('#hoverEventEntityName_edit').val('(Name)')
		}
		if ($('#hoverEventEntityType_edit').val() == '') {
			$('#hoverEventEntityType_edit').val('(Type)')
		}
		jobject[extraIndex].hoverEvent.value = '{id:'+removeWhiteSpace($('#hoverEventEntityID_edit').val())+',name:'+removeWhiteSpace($('#hoverEventEntityName_edit').val())+',type:'+removeWhiteSpace($('#hoverEventEntityType_edit').val())+'}';
	}
	if ($('#insertion_text_edit').val() != '') {
		jobject[extraIndex].insertion = $('#insertion_text_edit').val();
	} else {
		delete jobject[extraIndex].insertion;
	}

	$('#editModalData').hide();
	$('#snippetsWell').show();

	refreshOutput();
}
function clearExtraText() {
	delete jobject;
	refreshOutput();
}
function get_type(thing){
	if (thing===null) {
		return "[object Null]";
	}
	return Object.prototype.toString.call(thing);
}
function modifyExtraText(index,text) {
	if (text != "" && text != null) {
		jobject[index].text = text;
	}
	refreshOutput();
}
function addNewIterateFlag() {
	jobject.push({"NEW_ITERATE_FLAG":true});
	refreshOutput();
}
function cancelAddExtra() {
	showView('tellraw');
	clearExtra();
}
function addExtra() {
	editing = false;
	if (extraTextFormat == 'raw' && $('#text_extra').val() == '') {
		$('#text_extra_container').addClass('has-error');
		$('#text_extra').focus();
		$('#textsnippets-add-button').removeClass('btn-default');
		$('#textsnippets-add-button').addClass('btn-danger');
		return false;
	} else if ($("#hoverEvent").val() == 'show_text' && $('#hoverEventTextSnippet').val() != '') {
		alert('You entered text, but never added it!');
		$('#hoverEventTextSnippet').focus();
		$('#textsnippets-add-button').removeClass('btn-default');
		$('#textsnippets-add-button').addClass('btn-danger');
		return false;
	} else {
		showView('tellraw');
	}
	if (get_type(jobject) != "[object Array]") {
		jobject = [];
	}
	var clickEventType = $("#clickEvent").val();
	var hoverEventType = $("#hoverEvent").val();

	jobject.push(new Object());
	var extraIndex = jobject.length - 1;
	if (extraTextFormat == 'trn') {
		jobject[extraIndex].translate = $('#translate_input').val();
		if (matchLength != 0) {
			if (get_type(jobject.with) != "[object Array]") {
				jobject[extraIndex].with = new Array();
			}
			for (var i = 0; i < matchLength; i++) {
				jobject[extraIndex].with[i] = $('#extraTranslationParameter'+i).val();
			};
		}
	} else if (extraTextFormat == 'raw') {
		jobject[extraIndex].text = $('#text_extra').val();
	} else if (extraTextFormat == 'obj') {
		jobject[extraIndex].score = new Object;
		jobject[extraIndex].score.name = $('#obj_player').val();
		jobject[extraIndex].score.objective = $('#obj_score').val();
	} else if (extraTextFormat == 'sel') {
		jobject[extraIndex].selector = $('#selector').val();
	}


	jobject[extraIndex].color = getSelected("color_extra");
	if (jobject[extraIndex].color == 'none') {
		delete jobject[extraIndex].color;
	}

	if (getChecked("bold_text_extra")) {
		jobject[extraIndex].bold = true;
	}
	if (getChecked("italic_text_extra")) {
		jobject[extraIndex].italic = true;
	}
	if (getChecked("underlined_text_extra")) {
		jobject[extraIndex].underlined = true;
	}
	if (getChecked("strikethrough_text_extra")) {
		jobject[extraIndex].strikethrough = true;
	}
	if (getChecked("obfuscated_text_extra")) {
		jobject[extraIndex].obfuscated = true;
	}

	if (clickEventType != "none") {
		jobject[extraIndex].clickEvent = new Object();
		jobject[extraIndex].clickEvent.action = clickEventType;
		jobject[extraIndex].clickEvent.value = $('#clickEventText').val();
		if (clickEventType == "run_command" || clickEventType == "suggest_command") {
			if ($('#clickEventText').val().length > 256) {
				alert('Commands cannot be longer than 256 characters!\nYou should edit the length of your command before using this in game.');
			}
		}

	}
	if (hoverEventType != "none") {
		jobject[extraIndex].hoverEvent = new Object();
		jobject[extraIndex].hoverEvent.action = hoverEventType;
		if (hoverEventType == 'show_text') {
			jobject[extraIndex].hoverEvent.value = JSON.parse($('#hoverEventText').val());
			if ($('#color_hover').val() != 'none') {
				jobject[extraIndex].hoverEvent.value.color = $('#color_hover').val();
			}
		} else {
			jobject[extraIndex].hoverEvent.value = $('#hoverEventValue').val();
		}
	}
	if (hoverEventType == "show_entity") {
		if ($('#hoverEventEntityID').val() == '') {
			$('#hoverEventEntityID').val('(ID)')
		}
		if ($('#hoverEventEntityName').val() == '') {
			$('#hoverEventEntityName').val('(Name)')
		}
		if ($('#hoverEventEntityType').val() == '') {
			$('#hoverEventEntityType').val('(Type)')
		}
		jobject[extraIndex].hoverEvent.value = '{id:'+removeWhiteSpace($('#hoverEventEntityID').val())+',name:'+removeWhiteSpace($('#hoverEventEntityName').val())+',type:'+removeWhiteSpace($('#hoverEventEntityType').val())+'}';
	}
	if ($('#insertion_text').val() != '') jobject[extraIndex].insertion = $('#insertion_text').val();
	clearExtra();
	refreshOutput();

}
function refreshOutput(input) {
	/*VERIFY CONTENTS*/
	jobject = verify_jobject_format(jobject);

	//TODO: What the fuck
	if (!$('#command').val().includes('%s')) {
		$('#command').val('/tellraw @p %s');
		lsm.setItem('jtemplate','tellraw');
	}

	/*EXTRA MODAL COLOR PREVIEW MANAGER*/
	$('#colorPreviewColor').css({ 'background-color': getCSSHEXFromWord(getSelected('color_extra')) });

	/*EXTRA VIEWER MANAGER*/
	$('#textsnippets_header').html(getLanguageString('textsnippets.header',lsm.getItem('langCode')));
	if (input != 'previewLineChange') {
		if (get_type(jobject) == "[object Array]") {
			var extraOutputPreview = "";
			$('.extraContainer div.extraRow').remove();
			$('.extraContainer').html('');
			for (var i = 0; i <= jobject.length - 1; i++) {
				if (lsm.getItem('flyEnabled') == "yes") {
					flyButton = '<i onclick="fly(' + i + ')" class="fa fa-plane"></i>';
				} else {
					flyButton = "";
				}
				if (jobject.length-1 > i) {
					downButton = '<i onclick="moveUp(' + i + ')" class="fa fa-arrow-circle-down"></i> ';
				} else {
					downButton = "";
				}
				if (i > 0) {
					upButton = '<i onclick="moveUp(' + (i-1) + ')" class="fa fa-arrow-circle-up"></i> ';
				} else {
					upButton = "";
				}
				if (jobject[i].NEW_ITERATE_FLAG) {
					if (templates[lsm.getItem('jtemplate')].formatType != 'bookarray' && templates[lsm.getItem('jtemplate')].formatType != 'signset') {
						var tempJSON = '<span style="color:gray;text-decoration:line-through;" lang="textsnippets.NEW_ITERATE_FLAG.buttontext"></span>';
					} else {
						var tempJSON = '<span lang="textsnippets.NEW_ITERATE_FLAG.buttontext"></span>';
					}
					var saveButton = '';
				} else {
					if (get_type(jobject[i].text) != "[object Undefined]") {
						var tempJSON = '<input id="previewLine'+i+'" onkeyup="jobject['+i+'].text = $(\'#previewLine'+i+'\').val(); refreshOutput(\'previewLineChange\')" type="text" class="form-control previewLine" value="'+jobject[i].text+'">';
						var saveButton = '';
					} else if (get_type(jobject[i].translate) != "[object Undefined]") {
						var tempJSON = '<input type="text" class="form-control previewLine" disabled value="'+jobject[i].translate+'">';
						var saveButton = '';
					} else if (get_type(jobject[i].score) != "[object Undefined]") {
						var tempJSON = '<input type="text" class="form-control previewLine" disabled value="'+jobject[i].score.name+'\'s '+jobject[i].score.objective+' score">';
						var saveButton = '';
					} else if (get_type(jobject[i].selector) != "[object Undefined]") {
						var tempJSON = '<input type="text" class="form-control previewLine" disabled value="Selector: '+jobject[i].selector+'">';
						var saveButton = '';
					}
					if (input == 'noEditIfMatches' && jobject[i].text != $('#previewLine'+matchTo).val()) {
						var blah = 'blah'; /* wtf */
					} else {
						tempJSON = '<div class="row"><div class="col-xs-10 col-md-11">'+tempJSON+'</div><div class="col-xs-2 col-md-1"><div class="colorPreview"><div class="colorPreviewColor" style="background-color:'+getCSSHEXFromWord(jobject[i].color)+'"></div></div></div></div>';
					}
				}
				var deleteButton = '<i id="'+i+'RowEditButton" onclick="editExtra('+i+');" class="fa fa-pencil"></i> <i onclick="deleteIndex('+ i +');" class="fa fa-times-circle"></i> ';
				if (jobject[i].NEW_ITERATE_FLAG) {
					deleteButton = '<i style="color:gray;" class="fa fa-pencil"></i> <i onclick="deleteIndex('+ i +');" class="fa fa-times-circle"></i> ';
				}
				$('.extraContainer').append('<div class="row extraRow row-margin-top row-margin-bottom mover-row RowIndex' + i + '"><div class="col-xs-4 col-sm-2 col-lg-1">'+deleteButton+downButton+upButton+flyButton+'</div><div class="col-xs-8 col-sm-10 col-lg-11" style="padding:none;">'+tempJSON+'</div></div>');
			}
			if (jobject.length == 0) {
				delete jobject;
				$('.extraContainer').html('<br><br>');
				refreshLanguage();
			}
		} else {
			$('.extraContainer div.extraRow').remove();
			$('.extraContainer').html('<div class="row"><div class="col-xs-12"><h4>'+getLanguageString('textsnippets.nosnippets',lsm.getItem('langCode'))+'</h4></div></div>');
		}
		refreshLanguage();
	}

	/* SHOW MOUSE ACTION OPTIONS FOR JSON TEMPLATES WITH THAT FLAG */
	var mouseOptions = templates[lsm.getItem('jtemplate')].mouseActionOptions;
	if (mouseOptions.indexOf(MOUSE_ACTION_HOVER) != -1) {
		$('.hoverEventContainer_edit').show();
		$('.hoverEventContainer').show();

		$('.hoverEventDisabledSigns').hide();
	} else {
		$('.hoverEventContainer_edit').hide();
		$('.hoverEventContainer').hide();

		$('.hoverEventDisabledSigns').show();
	}

	if (mouseOptions.indexOf(MOUSE_ACTION_CLICK) != -1) {
		$('.clickEventContainer_edit').show();
		$('.clickEventContainer').show();

		//Signs are stupid
		$('.clickEventDisabledSigns').hide();
	} else {
		$('.clickEventContainer_edit').hide();
		$('.clickEventContainer').hide();

		//Signs are stupid
		if (templates[lsm.getItem('jtemplate')].formatType == 'signset') {
			$('.clickEventDisabledSigns').show();
		}
	}

	if (mouseOptions.indexOf(MOUSE_ACTION_INSERTION) != -1) {
		$('.insertionContainer_edit').show();
		$('.insertionContainer').show();
	} else {
		$('.insertionContainer_edit').hide();
		$('.insertionContainer').hide();
	}

	/* add-ITERATE-FLAG-label and add-ITERATE-FLAG*/

	var templateItem = templates[lsm.getItem('jtemplate')];

	if (templateItem.formatType == 'bookarray' || templateItem.formatType == 'signset') {
		$('#add-ITERATE-FLAG').fadeIn();
		if (templateItem.formatType == 'bookarray') {
			$('#add-ITERATE-FLAG-label').attr('lang','textsnippets.NEW_ITERATE_FLAG.add.book');
		} else if (templateItem.formatType == 'signset') {
			$('#add-ITERATE-FLAG-label').attr('lang','textsnippets.NEW_ITERATE_FLAG.add.sign');
		}
		refreshLanguage();
	} else {
		$('#add-ITERATE-FLAG').fadeOut();
	}

	/*EXTRA TRANSLATE STRING MANAGER*/

	if (extraTextFormat == "trn") {
		$('#obj_extra_container').hide();
		$('#text_extra_container').hide();
		$('#selector_extra_container').hide();
		$('#translate_selector_container').show();
		if (!hasAlertedTranslationObjects) {
			alert('Translation objects are currently broken and may crash your game.\nPlease test your translation before publishing it.');
			hasAlertedTranslationObjects = true;
		}
	} else if (extraTextFormat == "obj") {
		$('#text_extra_container').hide();
		$('#translate_selector_container').hide();
		$('#selector_extra_container').hide();
		$('#obj_extra_container').show();
	} else if (extraTextFormat == "sel") {
		$('#text_extra_container').hide();
		$('#translate_selector_container').hide();
		$('#selector_extra_container').show();
		$('#obj_extra_container').hide();
	} else if (extraTextFormat == "raw") {
		$('#text_extra_container').show();
		$('#obj_extra_container').hide();
		$('#translate_selector_container').hide();
		$('#selector_extra_container').hide();
		$('.extraTranslationParameterRow').hide();
	}

	/*COMMAND MANAGER*/
	if ($("#command").val() == "") $("#command").val(templates[lsm.getItem('jtemplate')]['command']);

	/*HOVEREVENT SUGGESTION MANAGER*/
	$('#hoverEventValue').removeAttr('disabled');
	selectedHover = getSelected("hoverEvent");
	if (selectedHover == "show_achievement") {
		$('#hoverEventValue').autocomplete({
			source: achievements
		});
	} else if (selectedHover == "show_item") {
		$('#hoverEventValue').autocomplete({
			source: []
		});
	} else if (selectedHover == "show_entity") {
		$('.hovertext_default').hide();
		$('.hovertext_entity').show();
	} else if (selectedHover == "none") {
		$('#hoverEventValue').attr('disabled','true');
		$('#hoverEventValue').autocomplete({
			source: []
		});
	}
	if (selectedHover != "show_entity") {
		$('.hovertext_default').show();
		$('.hovertext_entity').hide();
	}
	if (selectedHover == "show_text") {
		$('.hovertext_default').hide();
		$('.hovertext_text').show();
		$('#hoverEventText').val(JSON.stringify({"text":"","extra":[]}));
	} else {
		$('.hovertext_text').hide();
	}

	/*HOVEREVENT EDIT SUGGESTION MANAGER*/
	$('#hoverEventText_edit').removeAttr('disabled');
	selectedHover_edit = getSelected('hoverEvent_edit');
	if (selectedHover_edit == "show_achievement") {
		$('#hoverEventText_edit').autocomplete({
			source: achievements
		});
	} else if (selectedHover_edit == "show_item") {
		$('#hoverEventText_edit').autocomplete({
			source: []
		});
	} else if (selectedHover_edit == "show_entity") {
		$('.hovertext_default_edit').hide();
		$('.hovertext_entity_edit').show();
	} else if (selectedHover_edit == "none") {
		$('#hoverEventText_edit').attr('disabled','true');
		$('#hoverEventText_edit').autocomplete({
			source: []
		});
	}
	if (selectedHover_edit != "show_entity") {
		$('.hovertext_default_edit').show();
		$('.hovertext_entity_edit').hide();
	}
	if (selectedHover_edit != "show_text") {
		$('.hovertext_text_edit').hide();
	} else {
		$('.hovertext_text_edit').show();
	}

	/*CLICKEVENT SUGGESTION MANAGER*/
	$('#clickEventText').removeAttr('disabled');
	selectedClick = getSelected("clickEvent");
	if (selectedClick == "run_command" || selectedClick == "suggest_command") {
		$('#clickEventText').autocomplete({
			source: commands
		});
	} else if (selectedClick == "open_url") {
		$('#clickEventText').autocomplete({
			source: ["https://", "http://", "http://apple.com", "https://minecraft.net", "https://mojang.com", "http://ezekielelin.com", "https://reddit.com"]
		});
	} else if (selectedClick == "none") {
		$('#clickEventText').attr('disabled','true');
		$('#clickEventText').autocomplete({
			source: []
		});
	}

	/*CLICKEVENT EDIT SUGGESTION MANAGER*/
	$('#clickEventText_edit').removeAttr('disabled');
	selectedClick_edit = getSelected('clickEvent_edit');
	if (selectedClick_edit == "run_command" || selectedClick_edit == "suggest_command") {
		$('#clickEventText_edit').autocomplete({
			source: commands
		});
	} else if (selectedClick_edit == "open_url") {
		$('#clickEventText_edit').autocomplete({
			source: ["http://apple.com", "https://minecraft.net", "https://mojang.com", "http://ezekielelin.com", "https://", "https://reddit.com", "http://"]
		});
	} else if (selectedClick_edit == "none") {
		$('#clickEventText_edit').attr('disabled','true');
		$('#clickEventText_edit').autocomplete({
			source: []
		});
	}

	/*PREPARING OUTPUT*/

	var commandString = $('#command').val();

	var JSONOutputString = '';
	var EscapedJSONOutputString = '';
	var formattedJObject = formatJObjectList(jobject);

	var newLineExpressions = {
		"bookarray": /\\\\\\\\n/g,
		"standardjson": /\\\\n/g,
		"signset": /\\\\\\\\n/g
	}
	if (!formattedJObject.length > 0) {
		JSONOutputString = '[]';
	} else {
		if (templates[lsm.getItem('jtemplate')].formatType == 'bookarray') {
			JSONOutputString = JSON.stringify(formattedJObject);
			JSONOutputString = JSONOutputString.replace(newLineExpressions.bookarray,'\\n');
		} else if (templates[lsm.getItem('jtemplate')].formatType == 'standardjson') {
			JSONOutputString = formattedJObject[0];
			JSONOutputString = JSONOutputString.replace(newLineExpressions.standardjson,'\\n');
		} else if (templates[lsm.getItem('jtemplate')].formatType == 'signset') {
			JSONOutputString = 'Text1:' + JSON.stringify(formattedJObject[0]);
			if (formattedJObject.length > 1) {
				JSONOutputString += ',Text2:' + JSON.stringify(formattedJObject[1])
			}
			if (formattedJObject.length > 2) {
				JSONOutputString += ',Text3:' + JSON.stringify(formattedJObject[2])
			}
			if (formattedJObject.length > 3) {
				JSONOutputString += ',Text4:' + JSON.stringify(formattedJObject[3])
			}
			JSONOutputString = JSONOutputString.replace(newLineExpressions.signset,'\\n');
		}
	}

	commandString = commandString.replace('%s',JSONOutputString);

	outputString = commandString;

	$('#outputtextfield').val(outputString);
	if ($('#showNiceLookingOutput').is(':checked')) {
		lsm.setItem('nlOutput','yes');
		$('#nicelookingoutput').show().html(JSON.stringify(jobject, null, 4).replace(newLineExpressions.standardjson,'\\n'));
	} else {
		lsm.setItem('nlOutput','no');
		$('#nicelookingoutput').hide();
	}
	jsonParse();

	/*COMMAND BLOCK WARNING*/
	if ($('#outputtextfield').val().length > 256) {
		$('#commandblock').show();
	} else {
		$('#commandblock').hide();
	}

	/*SAVE VARIABLES*/
	lsm.setItem('jobject',JSON.stringify(jobject));
	lsm.setItem('jcommand', $('#command').val());

	/*RERUN*/
	if (input != 'noLoop' && input != 'previewLineChange') {
		refreshOutput('noLoop');
	}
}
function jsonParse() {
	$('#jsonPreview').css('background-color','#'+$('#previewcolor').val());
	$('#jsonPreview').css('font-size',$('#previewFontSize').val() + 'px');
	lsm.setItem("color",$('#previewcolor').val());
	$('#jsonPreview').html('');
	if (templates[lsm.getItem('jtemplate')].formatType == 'bookarray') {
		$('#jsonPreview').addClass('bookPreview');
		$('#previewBack').show();
		$('#previewForwards').show();
		$('#previewPage').show();
	} else {
		$('#jsonPreview').removeClass('bookPreview');
		$('#previewBack').hide();
		$('#previewForwards').hide();
		$('#previewPage').hide();
	}

	if (jobject.length > 0) {
		let pageHash = {};
		let counter = 1;
		for (var i = 0; i < jobject.length; i++) {
			if (jobject[i].NEW_ITERATE_FLAG) {
				counter++;
			} else {
				pageHash['index.' + i] = counter;

				topPage = counter;

			}
		}

		if (jobject.length == 0) {
			topPage = 1;
		}

		if (bookPage > topPage) {
			bookPage = topPage;
		}

		//console.log(pageHash);

		$('#previewPage').html('Page ' + bookPage + ' of ' + topPage);

		for (var i = 0; i < jobject.length; i++) {
			if (jobject[i].NEW_ITERATE_FLAG) {
				if (/*templates[lsm.getItem('jtemplate')].formatType == 'bookarray' || */templates[lsm.getItem('jtemplate')].formatType == 'signset') {
					$('#jsonPreview').append('<span id="jsonPreviewSpanElement'+ i +'"><hr></span>');
				}
			} else if (pageHash['index.' + i] == bookPage || templates[lsm.getItem('jtemplate')].formatType != 'bookarray') {
				let doClickEvent = false;
				let doHoverEvent = false;
				let popoverTitle = "";
				let popoverContentClick = "";
				let popoverContentHover = "";
				let hoverEventType = "";
				let hoverEventValue = "";
				let clickEventType = "";
				let clickEventValue = "";
				$('#jsonPreview').append('<span id="jsonPreviewSpanElement'+ i +'"></span>');

				if (jobject[i].text) {
					$('#jsonPreviewSpanElement'+i).html(jobject[i].text.replace(/\\\\n/g,'<br>').replace(/\\n/g,'<br>'));
				} else if (jobject[i].score) {
					$('#jsonPreviewSpanElement'+i).html('<span class="label label-info">' + jobject[i].score.name + ':' + jobject[i].score.objective + '</span>');
				} else if (jobject[i].translate) {
					$('#jsonPreviewSpanElement'+i).html('<span class="label label-warning">Translation</span>');
				} else if (jobject[i].selector) {
					$('#jsonPreviewSpanElement'+i).html('<span class="label label-primary">' + jobject[i].selector + '</span>');
				} else {
					$('#jsonPreviewSpanElement'+i).html('<span class="label label-danger">Unknown Element</span>');
				}

				if (jobject[i].bold == true) {
					$('#jsonPreviewSpanElement'+i).addClass('bold');
				}
				if (jobject[i].italic == true) {
					$('#jsonPreviewSpanElement'+i).addClass('italic');
				}
				if (jobject[i].underlined == true) {
					$('#jsonPreviewSpanElement'+i).addClass('underlined');
				}
				if (jobject[i].strikethrough == true) {
					if ($('#jsonPreviewSpanElement'+i).hasClass('underlined')) {
						$('#jsonPreviewSpanElement'+i).removeClass('underlined');
						$('#jsonPreviewSpanElement'+i).addClass('strikethroughunderlined');
					} else {
						$('#jsonPreviewSpanElement'+i).addClass('strikethrough');
					}
				}
				if (jobject[i].obfuscated == true) {
					$('#jsonPreviewSpanElement'+i).addClass('jsonPreviewObfuscated');
				}

				/*COLORS*/
				$('#jsonPreviewSpanElement'+i).css('color',getCSSHEXFromWord(jobject[i].color));

				/*CLICK & HOVER EVENTS*/

				if (get_type(jobject[i].clickEvent) != "[object Undefined]" || get_type(jobject[i].hoverEvent) != "[object Undefined]") {
					if (get_type(jobject[i].clickEvent) != "[object Undefined]") doClickEvent = true;
					if (get_type(jobject[i].hoverEvent) != "[object Undefined]") doHoverEvent = true;
					if (doHoverEvent && doClickEvent) {
						popoverTitle = getLanguageString('textsnippets.hoverevent.header',lsm.getItem('langCode')) + ' and ' + getLanguageString('textsnippets.clickevent.header',lsm.getItem('langCode'));
						hoverEventType = jobject[i].hoverEvent.action;
						hoverEventValue = jobject[i].hoverEvent.value;
						clickEventType = jobject[i].clickEvent.action;
						clickEventValue = jobject[i].clickEvent.value;
					}
					if (doHoverEvent && !doClickEvent) {
						popoverTitle = getLanguageString('textsnippets.hoverevent.header',lsm.getItem('langCode'));
						hoverEventType = jobject[i].hoverEvent.action;
						hoverEventValue = jobject[i].hoverEvent.value;
					}
					if (!doHoverEvent && doClickEvent) {
						popoverTitle = getLanguageString('textsnippets.clickevent.header',lsm.getItem('langCode'));
						clickEventType = jobject[i].clickEvent.action;
						clickEventValue = jobject[i].clickEvent.value;
					}
					if (doClickEvent) {
						if (clickEventType == "open_url") {
							popoverContentClick = clickEventType+':<a href="'+clickEventValue+'">'+clickEventValue+'</a>';
						} else {
							popoverContentClick = clickEventType+':'+clickEventValue;
						}
					}
					if (doHoverEvent) {
						if (hoverEventType == 'show_text') {
							hoverEventValue = JSON.stringify(hoverEventValue);
						}
						popoverContentHover = hoverEventType+':'+hoverEventValue;
					}
					if (doHoverEvent && doClickEvent) {
						popoverContentClick = popoverContentClick + '<br>';
					}
					$('#jsonPreviewSpanElement'+i).attr('rel','popover');
				}
				$('#jsonPreviewSpanElement'+ i).popover({ title: popoverTitle, content: popoverContentClick+popoverContentHover, html:true});
			}
		}
	} else {
		$('#jsonPreview').html(getLanguageString('output.nothing',lsm.getItem('langCode')));
		$('#jsonPreview').css('color','white');
	}
	if ($('.jsonPreviewObfuscated').length > 0) {
		setTimeout(obfuscationPreviewHandler, 20);
	}
}
function refreshLanguage(dropdownSelection) {
	$('#language_keys').children().remove();
	for (var i = 0; i < Object.keys(lang).length; i++) {
		$('#language_keys').append('<li><a onclick="errorString = \''+ getLanguageName(Object.keys(lang)[i]) +'<br><br>\'; lsm.setItem(\'langCode\',\''+Object.keys(lang)[i]+'\'); refreshLanguage(true); refreshOutput();"><span class="' + Object.keys(lang)[i] + ' langSelect" id="language_select_'+Object.keys(lang)[i]+'">'+ getLanguageName(Object.keys(lang)[i]) +'</span></a></li>');
	};
	if (Object.keys(lang).length != languageCodes.length) {
		$('#language_keys').append('<li><a><i class="fa fa-spinner fa-pulse fa-fw" aria-hidden="true"></i></a></li>');
	}
	$('#language_keys').append('<li class="divider"></li>');
	$('#language_keys').append('<li><a href="http://translate.minecraftjson.com"><span class="language_area" lang="language.translate"></span></a></li>');

	$('.langSelect').removeClass('label label-success');
	$('.' + lsm.getItem('langCode')).addClass('label label-success');

	if (lang[lsm.getItem('langCode')]) {
		$('*').refreshLanguage(lsm.getItem('langCode'));
	} else {
		lsm.setItem('langCode', defaultLanguage)
	}

	$('*').each(function(){
		if ($(this).attr('version') != undefined && (lsm.getItem('versionIndicators') == "true" || lsm.getItem('versionIndicators') == undefined)) {
			let levels = {
				"1.13": "danger",
				"1.12": "danger",
				"1.11": "warning",
				"1.10": "success",
				"1.9": "success",
				"1.8": "success",
				"1.7": "success"
			};
			let labelLevel = 'success';
			if (levels[$(this).attr('version')]) {
				labelLevel = levels[$(this).attr('version')];
			}
			if (labelLevel != "success") {
				if ($(this).prop('tagName') == 'OPTION') {
					$(this).prepend('('+$(this).attr('version')+') ');
				} else {
					$(this).append(' <span class="label label-'+labelLevel+'">'+$(this).attr('version')+'</span>');
				}
			}
		}
	});
}

function initialize() {
	if (lsm.getItem('initialTimestamp') == undefined) {
		lsm.setItem('initialTimestamp',new Date().getTime())
	}

	if (lsm.getItem('langCode') == undefined) {
		if (lang[navigator.language.toLowerCase()] != undefined) {
			lsm.setItem('langCode',navigator.language.toLowerCase());
		} else {
			if (webLangRelations[navigator.language.toLowerCase()] != undefined) {
				lsm.setItem('langCode',webLangRelations[navigator.language.toLowerCase()]);
			}
		}
	}

	if (lsm.getItem('langCode') == undefined) {
		lsm.setItem('langCode', defaultLanguage);
	}

	if (sessionStorage.getItem('nextTimeAlert')) {
		alert(sessionStorage.getItem('nextTimeAlert'));
		sessionStorage.removeItem('nextTimeAlert');
	}
	if (lsm.getItem('nextTimeAlert')) {
		alert(lsm.getItem('nextTimeAlert'));
		lsm.removeItem('nextTimeAlert');
	}

	for (var i = 0; i < Object.keys(templates).length; i++) {
		let key = Object.keys(templates)[i]
		if (key == lsm.getItem('jtemplate')) {
			var classString = 'btn-success';
		} else {
			var classString = 'btn-default';
		}
		$('#templateButtons').append('<button class="btn btn-xs ' + classString + ' templateButton" lang="template.' + key + '" version="' + templates[key]['version'] + '" template="'+ key +'"></button> ');
	}
	if (lsm.getItem('jtemplate') == undefined) {
		lsm.setItem('jtemplate', 'tellraw');
	}
	if (lang[lsm.getItem('langCode')]) {
		errorString = getLanguageName(lsm.getItem('langCode')) + '<br><br>';
	} else {
		errorString = '&lt;language unknown&gt;<br><br>';
	}

	$('.extraTranslationParameterRow').hide();

	if (lsm.getItem('color') != undefined) {
		$('#previewcolor').val(lsm.getItem("color"));
	} else {
		$('#previewcolor').val('617A80');
	}
	$('#previewcolor').css('background-color','#'+$('#previewcolor').val());

	if (sessionStorage.getItem('nextTimeImport')) {
		importString(sessionStorage.getItem('nextTimeImport'));
		sessionStorage.removeItem('nextTimeImport');
	} else if (lsm.getItem('jobject') != undefined) {
		jobject = verify_jobject_format(JSON.parse(lsm.getItem("jobject")));
	}

	if (lsm.getItem('jformat') != version && lsm.getItem('jformat') != undefined) {
		let exported = makeExportString();
		sessionStorage.setItem('nextTimeImport', exported);
		sessionStorage.setItem('nextTimeAlert', 'Updated from ' + lsm.getItem('jformat') + ' to ' + version);
		lsm.clear();
		location.reload();
		return;
	} else {
		/*check if alert isn't correctly set. Do not show the alert is jformat isn't set – that means the user hasn't been here before*/
		if (lsm.getItem('jalert') != notice.id && lsm.getItem('jformat') != undefined && notice.show) {
			alert(notice.message);
		}
		lsm.setItem('jalert', notice.id);
	}
	lsm.setItem('jformat', version);

	if (lsm.getItem('nlOutput') == undefined) {
		lsm.setItem('nlOutput', 'no');
	}

	if (lsm.getItem('nlOutput') == 'no') {
		$('#showNiceLookingOutput').prop('checked', false);
	} else {
		$('#showNiceLookingOutput').prop('checked', true);
	}

	showView('pageheader',true,false);
	//JSON.stringify({"viewname":viewname,"suppressAnimation":suppressAnimation,"hideOthers":hideOthers,"hideMenubar":hideMenubar})
	if (lsm.getItem('jview') != undefined/* && typeof JSON.stringify(lsm.getItem('jview')) != "string"*/) {
		let viewObject = JSON.parse(lsm.getItem('jview'));
		showView(viewObject.viewname,viewObject.suppressAnimation,viewObject.hideOthers,viewObject.hideMenubar);
	} else {
		showView('tellraw')
	}
	if (lsm.getItem('jtosaccept') == undefined || lsm.getItem('jtosaccept') != tos_version) {
		//showView('tos-header',true,false,true);
	}
	$('.templateButton').click(function(){
		$('.templateButton').removeClass('btn-success').removeClass('btn-default').addClass('btn-default');
		$(this).addClass('btn-success').removeClass('btn-default');

		let template = $(this).attr('template');

		lsm.setItem('jtemplate',template);
		$('#command').val(templates[lsm.getItem('jtemplate')]['command']);

		refreshOutput();
	});

	$('#command').val(lsm.getItem('jcommand'));

	$('#command').change(refreshOutput());

	$('#import').click(function() {
		if (importString(prompt(getLanguageString('settings.importtext.exported.description',lsm.getItem('langCode'))))) {
			alert("Your command has been imported");
		}
		refreshOutput();

	});

	refreshOutput();
	refreshLanguage();

	$('#export').click(function(){
		$('#exporter').remove();
		$('.alerts').append('<div id="exporter" class="alert alert-info"><h4 lang="export.heading"></h4><p><textarea readonly id="exportText">' + makeExportString() + '</textarea></p><p><button type="button" onclick="closeExport()" class="btn btn-default" lang="export.close"></button></p></div>');
		$exportText = $('#exportText');
		$exportText.select();
		$exportText.click(function(){
			this.select();
		});
		goToByScroll('exporter');
		refreshLanguage();
	});

	$('.fmtExtra').on('click', function(){
		extraTextFormat = $(this).attr('tellrawType');
		$('.fmtExtra').removeClass('active');
		$(this).addClass('active');
		refreshOutput();
	});
	$('#addHoverTextText').on('click',function(){
		textobj = JSON.parse($('#hoverEventText').val());
		snipobj = {"text":$('#hoverEventTextSnippet').val()};
		if ($('#snippetcolor').val() != 'none') {
			snipobj.color = $('#snippetcolor').val();
		}
		$('#hoverEventTextSnippet').val('');
		textobj.extra.push(snipobj)
		$('#hoverEventText').val(JSON.stringify(textobj));
	});
	$('#removeHoverTextText').on('click',function(){
		textobj = JSON.parse($('#hoverEventText').val());
		textobj.extra.splice(-1,1)
		$('#hoverEventText').val(JSON.stringify(textobj));
	});
	$('#addExtraButton').on('click',function(){
		showView('add-extra')
		editing = true;
	});
	$('#lang_request').on('click',function(){
		showView('lang-request');
		$('#lang-request-errorstring').html(errorString);
	});
	$('#helptoggle').click(function(){
		$('.help-box').toggle();
	});
	$('#enable_dark_mode').on('click',function(){
		lsm.setItem('darkMode','true');
		$('body').addClass('black-theme');
		$(this).hide();
		$('#disable_dark_mode').show();
	});
	$('#disable_dark_mode').on('click',function(){
		lsm.setItem('darkMode','false');
		$('body').removeClass('black-theme');
		$(this).hide();
		$('#enable_dark_mode').show();
	});
	$('.report-issue').on('click',function(){
		$('.view-container[view="report-issue"]').children().not('.cancel-issue-row').hide();
		$('#issue-workflow-r1').show();
		showView('report-issue');
	});

	$('#previewBack').click(function(){
		if (bookPage != 1) bookPage--;
		refreshOutput();
	});

	$('#previewForwards').click(function(){
		if (bookPage < topPage) bookPage++;
		refreshOutput();
	});

	$('.issue-button').click(function(){
		let parentRow = $(this).parent().parent();
		parentRow.hide();
		let id = $(this).attr('id');
		if (id == "translation-issue-button") {
			$('#issue-workflow-r2-translation').fadeIn();
		} else if (id == "output-issue-button") {
			$('#issue-workflow-r2-output').fadeIn();
		} else if (id == "translation-current-issue-button") {
			reportAnIssue('Translation Issue (' + lsm.getItem('langCode') + ')');
			showView('tellraw');
		} else if (id == "translation-other-issue-button") {
			reportAnIssue('Translation Issue (Other)');
			showView('tellraw');
		} else if (id == "output-quotes-issue-button") {
			$('.templateButton[template=tellraw]').click();
			alswer('The issue should be fixed.\nIf it is not, please report as Output > Other, and note this event in your report..','info');
			showView('tellraw');
		} else if (id == "output-badpreview-issue-button") {
			alert('I\'m currently not accepting complaints about the format of the book layout');
			if (confirm('Would you still like to report an issue?')) {
				reportAnIssue('Output Issue (Bad Preview)');
			}
			showView('tellraw');
		} else if (id == "output-other-issue-button") {
			reportAnIssue('Output Issue (Other)');
			showView('tellraw');
		} else if (id == "cancel-issue-button") {
			showView('tellraw');
			parentRow.show();
		} else {
			showView('tellraw');
			reportAnIssue();
		}
	});

	// Beta tooltip
	// $('#dropdown-list-a').tooltip({"title":"<i style=\"color: #F8814C;\" class=\"fa fa-exclamation-circle\"></i> " + getLanguageString('headerbar.dropdown.hover',lsm.getItem('langCode')),"html":true,"placement":"bottom"});
	// if (lsm.getItem('beta-tooltip-a-shown') != "yes") {
		// $('#dropdown-list-a').tooltip('show');
	// }
	// lsm.setItem('beta-tooltip-a-shown',"yes");

	//Dark Mode

	if (lsm.getItem('darkMode') && lsm.getItem('darkMode') == 'true') {
		$('#enable_dark_mode').click(); //Finish setting up dark mode after handlers exist
	}
}
$(document).ready(function(){
	if (lsm.getItem('darkMode') && lsm.getItem('darkMode') == 'true') {
		$('body').addClass('black-theme'); //Rest of "dark mode" is handled later, color scheme handled early for appearance
	} else if (lsm.getItem('darkMode') == undefined) {
		$('body').addClass('black-theme');
		lsm.setItem('darkMode','true');
	}
	$('.view-container').hide();
	showView('loading',true,true,true);

	$('#loadingtxt').html('Loading Assets');
	try {
		$.ajax({
			url: 'resources.json',
			type: 'GET',
			dataType: 'json',
			success: resourcesJSON => {
				if (location.hash == "#embed") {
					$('.view-container[view="tellraw"]').children().filter('br').remove();
					embed = true;
				} else {
					embed = false;
				}

				webLangRelations = resourcesJSON['web_language_relations'];
				achievements = resourcesJSON['achievements'];
				commands = resourcesJSON['commands'];
				defaultLanguage = resourcesJSON['default_language'];
				languageCodes = resourcesJSON['available_language_codes'];
				
				if (languageCodes.indexOf(lsm.getItem('langCode')) != -1) {
					defaultLanguage = lsm.getItem('langCode');
				}

				getLanguageData(defaultLanguage).then(data => {
					lang[defaultLanguage] = data;
					initialize();
				}, err => {
					hardFail(err);
				});
			},
			error: (request, error) => {
				hardFail("Request: "+JSON.stringify(request));
			}
		});
	} catch(err) {
		hardFail("An error occured loading page assets.");
		return;
	}
});
