var file_content;
var filtered=false;
document.getElementById('fileinput').addEventListener('change',readMultipleFiles, false);

function colorizeDims(log){
    line = log;
    var st,ip_num;
    if(line.search(/:::SV[0-9]*:::.*:::/)>-1){
	//This reg expression can even recognize more than one instrumented logs in the same line 
	st = line.match(/:::SV[0-9]*:::(?:(?!(:::)).)*:::/g);
	//TODO: global search over the line will return the matching sub-strings seperated by 'comma' if the string itself contains 'comma' then there is no way to distinguish and hence not coloring such lines.
	st = st.toString();
	var iter = st.split(',');
	for(var j=0;j<iter.length;j++){
	    var tag = iter[j];
	    var sv = tag.split(":::");
	    if(sv.length<3)
		continue;
	    //console.log(sv)
	    var ip_num = parseInt(sv[1].slice(2,sv[1].length));
	    var dim;
	    var log;

	    var s = ip_num;
	    if(!s)
		continue;
	    if(!ips[s]){
		continue;
	    }
	    dim = ips[s]["dimensionID"];
	    /*for(s=0;s<ips.length;s++){
	      log = ips[s];
	      if(log.IPNum == ip_num){
	      dim = log.dimensionID;
	      break;
	      }
	      }*/
	    var color;
	    for(var m=0;m<UniqueDims.length;m++){
		if(UniqueDims[m]==dim){
		    color = DimColors[m];
		}
	    }
	    var r=parseInt(color.substring(1,3),16);
	    var g=parseInt(color.substring(3,5),16);
	    var b=parseInt(color.substring(5,7),16);
	    var mx = (r>g?r:g)>b?(r>g?r:g):b;
	    var mn = Math.min(r,g,b);
	    if((mx+mn)/512.0>=(0.5)){
		line = line.replace(iter[j],'<span id="SV'+ip_num+'" onclick="group('+ip_num+')" style="background-color:black;color:'+color+'">'+sv[2]+"</span>");
	    }
	    else{
		line = line.replace(iter[j],'<span id="SV'+ip_num+'" onclick="group('+ip_num+')" style="background-color:white;color:'+color+'">'+sv[2]+"</span>");
	    }
	}
	line = "<span id='line"+ip_num+"'>"+line+"</span>";
    }
    return line;
}

function readMultipleFiles(evt) {
    //Retrieve all the files from the FileList object
    st=new Date().getTime();
    var files = evt.target.files; 
    if (files) {
	for (var i=0, f; f=files[i]; i++) {
	    console.log(f)
	    var r = new FileReader();
	    r.onload = (function(f) {
		return function(e) {
		    var contents = e.target.result;
		    contents = contents.split("\n")
		    file_content = contents;
		};
	    })(f);
	    r.readAsText(f);
	    
	}   
    } else {
	alert("Failed to load files"); 
    }
    et=new Date().getTime();
    console.log("Time to load the file is "+(et-st));
    setTimeout(function(){updateT()},1000);
}

function updateT(){
    var dataView;
    var grid;
    var data = [];
    var once=true;
    
    $(function (){
	var logs = file_content;
	var dims = [2];
	dims.shift();
	for(var i=0,line;i<logs.length;i++){
	    line = logs[i];
	    var st,ip_num;
	    if(line.search("::SV")>-1){
		//This reg exp can handle more than one match in the same line
		st = line.match(/::SV[0-9]*::/g);
		st = st.toString();
		var iter = st.split(',');
		for(var m=0,str;m<iter.length;m++){
		    str=iter[m];
		    var ne = str.slice(4,str.length-2);
		    ip_num = parseInt(ne);
		    for(var j=0,log;j<ips.length;j++){
			log = ips[j];
			if(log.IPNum == ip_num){
			    dims.push(log.dimensionID);
			}
		    }
		}
	    }
	}
	UniqueDims = dims.filter(function(elem, pos) {
	    return dims.indexOf(elem) == pos;
	})
    });

    $(function (){
	if(UniqueDims.length>100)
	    alert("Hey the number of dimensions is too many! I can colorize the values but you can barely distinguish colors;So it is recommended to use grouping rather than relying on coloring");
	DimColors = [];
	col = d3.scale.category10();
	for(var i=0;i<UniqueDims.length;i++)
	    DimColors.push(col(i));
    });

    function waitingFormatter(value) {
	return "wait...";
    }

    function renderColor(cellNode, row, dataContext, colDef) {
	/*var vals = [
	    dataContext["n1"],
	    dataContext["n2"],
	    dataContext["n3"],
	    dataContext["n4"],
	    dataContext["n5"]
	];*/
		
	$(cellNode).html(colorizeDims(dataContext["log"]));
		//$(cellNode).empty().sparkline(vals, {width: "100%"});
    }

    var columns = [{id: "l", name: "log", field: "log",width: 600, rerenderOnResize: false, asyncPostRender: renderColor}];

    var options = {
	editable: false,
	enableAddRow: false,
	enableCellNavigation: true,
	enableAsyncPostRender: true
    };

    var percentCompleteThreshold = 0;
    var prevPercentCompleteThreshold = 0;
    var h_runfilters = null;

    function myFilter(item, args) {
	if($('#filter').is(':checked')){
	    return (item["log"].search(/:::SV[0-9]*:::(?:(?!:::).)*:::/)>-1);
	}
	else
	    return true;
    }

    function DataItem(i,str) {
	this.num = i;
	this.id = "id_" + i;
	this.log = str;
    }

    $(function () {
	// prepare the data
	/*    for (var i = 0; i < 500000; i++) {
	      data[i] = new DataItem(i);
	      }*/
	file_content.map(function(d,i){data[i]=new DataItem(i,d);/*console.log(data[i]);*/});

	dataView = new Slick.Data.DataView({ inlineFilters: true });
	grid = new Slick.Grid("#myGrid", dataView, columns, options);
	var pager = new Slick.Controls.Pager(dataView, grid, $("#pager"));
	
	// wire up model events to drive the grid
	dataView.onRowCountChanged.subscribe(function (e, args) {
	    grid.updateRowCount();
	    grid.render();
	});

	dataView.onRowsChanged.subscribe(function (e, args) {
	    grid.invalidateRows(args.rows);
	    grid.render();
	});


	// wire up the slider to apply the filter to the model
	$("#pcSlider").slider({
	    "range": "min",
	    "slide": function (event, ui) {
		if (percentCompleteThreshold != ui.value) {
		    window.clearTimeout(h_runfilters);
		    h_runfilters = window.setTimeout(filterAndUpdate, 10);
		    percentCompleteThreshold = ui.value;
		}
	    }
	});
	$("#filter").change(function(){
	    window.setTimeout(filterAndUpdate, 10);
	});

	function filterAndUpdate() {
	    //var isNarrowing = percentCompleteThreshold > prevPercentCompleteThreshold;
	    //var isExpanding = percentCompleteThreshold < prevPercentCompleteThreshold;
	    var renderedRange = grid.getRenderedRange();

	    dataView.setFilterArgs();
	    if($('#filter').is(':checked'))
		dataView.setRefreshHints({
		    ignoreDiffsBefore: renderedRange.top,
		    ignoreDiffsAfter: renderedRange.bottom + 1,
		    isFilterNarrowing: true,
		    isFilterExpanding: false
		});
	    else if(filtered)
		dataView.setRefreshHints({
		    ignoreDiffsBefore: renderedRange.top,
		    ignoreDiffsAfter: renderedRange.bottom + 1,
		    isFilterNarrowing: false,
		    isFilterExpanding: true
		});
	    dataView.refresh();

	    //prevPercentCompleteThreshold = percentCompleteThreshold;
	}

	// initialize the model after all the events have been hooked up
	dataView.beginUpdate();
	dataView.setItems(data);
	dataView.setFilter(myFilter);
	//dataView.setFilterArgs(0);
	dataView.endUpdate();
    })
}
