var Viewer = {
loadCanvas: function () {
  this.canvas = $('graph');
  this.width = this.canvas.width;
  this.height = this.canvas.height;
  if (this.canvas.getContext) {
    this.ctx = this.canvas.getContext('2d');

    var _zoom = this.zoom.bind(this);
    this.canvas.addEventListener('mousewheel',function(event) {
        _zoom(event);
        event.preventDefault();
        return false;
    }, false);

    // var _trace = this.trace.bind(this);
    // this.canvas.addEventListener('mousemove', function (e) {
    //     _trace(e.clientX);
    // }, false);
  }

  this.bigGraph = {
    top: 20,
    bottom: 240,
    width: this.width,
    color: "rgb(74,144,226)",
    lineWidth: 4,
    lineTop: 0,
    decadeLabels: true,
    yearLines: true
  };

  this.scrubGraph = {
    top: 270,
    bottom: 300,
    width: this.width,
    color: "rgb(74,144,226)",
    lineWidth: 2,
    windowColor: "rgba(100,100,100,0.2)",
    lineTop: 290,
    decadeLabels: false,
    yearLines: false
  };

  this.curTimeMode = 0;
  this.loadTimeChooser();

  this.startMonth = 1200;
  this.endMonth = Infinity;
},

loadTimeChooser: function() {
  for (var i = 0; i < 3; i++) {
    var status = (i == this.curTimeMode) ? 'inherit' : 'none';
    $('time-mode-'+i).style.display = status;
  }
},

loadData: function (data) {
  this.mainData = data;
  this.maxMonth = data.vals.length * data.pointJump;

  // What if we zoom to 1870 and then switch to a set starting in 1890
  if(this.firstYear && data.firstYear != this.firstYear) {
    var delta = (this.firstYear - data.firstYear)*12;
    this.startMonth += delta;
    this.endMonth += delta;
    this.startMonth = Math.max(this.startMonth, 0);
    this.endMonth   = Math.max(this.endMonth, 20);
  }

  this.firstYear = data.firstYear;
  this.endMonth = Math.min(this.endMonth, this.maxMonth);

  // global maxes and mins
  var range = this.calcRange(this.mainData, 0, this.maxMonth);
  this.scrubGraph.min = range[0];
  this.scrubGraph.max = range[1];

  this.draw();
},

changeMode: function() {
  this.curTimeMode = (this.curTimeMode + 1) % 3;
  this.loadTimeChooser();
  this.draw();
},

fieldChanged: function() {
  function _validYear(year) {
    return (year.length == 4) && !isNaN(year);
  }

  var startYear = $('startYear'+this.curTimeMode).value;
  if(_validYear(startYear)) {
    this.startMonth = (parseInt(startYear) - this.firstYear)*12;
  }

  if(this.curTimeMode == 0) {
    var endYear = $('endYear').value;

    if(_validYear(endYear)) {
      this.endMonth = (parseInt(endYear) - this.firstYear)*12;
    }
  } else if(this.curTimeMode == 1) {
    var yearCount = $('yearCount').value;

    if(!isNaN(yearCount)) {
      this.endMonth = this.startMonth + yearCount*12;
    }
  }

  this.startMonth = Math.min(this.maxMonth, Math.max(0, this.startMonth));
  this.endMonth = Math.min(this.maxMonth, Math.max(0, this.endMonth));

  this.draw();
},

zoom: function (event) {
  var deltaFactor = (event.deltaMode == WheelEvent.DOM_DELTA_LINE) ? 20 : 1;
  var delta = event.deltaY * deltaFactor;
  var mouseX = event.clientX - this.canvas.offsetLeft;

  var span = this.endMonth-this.startMonth;
  var centerMonth = this.startMonth + mouseX/(this.width/span);
  var factor = 1 + delta * 0.0002;
  this.endMonth = Math.round(factor*this.endMonth - centerMonth*(factor - 1));
  this.startMonth = Math.round(factor*this.startMonth + centerMonth*(1 - factor));

  this.startMonth = Math.max(this.startMonth,0);
  this.endMonth = Math.min(Math.max(this.endMonth,this.startMonth+12), this.maxMonth);
  this.draw();
},

trace: function(x) {
  this.draw();

  var ctx = this.ctx;
  x = x - this.canvas.offsetParent.offsetLeft;

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgb(200,50,50)"
  ctx.textAlign = "center";
  ctx.font = "10pt Arial";
  ctx.fillStyle = "rgb(130,130,130)";

  ctx.beginPath();
  ctx.moveTo(x,0);
  ctx.lineTo(x,this.graphBottom);
  ctx.stroke();
},

updateTimeFields: function() {
  var startYear = Math.round(this.firstYear + (this.startMonth/12));
  var endYear = Math.round(this.firstYear + (this.endMonth/12));

  $('startYear'+this.curTimeMode).value = startYear;
  if(this.curTimeMode == 0) {
    $('endYear').value = endYear;
  } else if(this.curTimeMode == 1) {
    $('yearCount').value = endYear - startYear;
  } else if(this.curTimeMode == 2) {
    this.endMonth = this.maxMonth;
  }
},

updateStats: function (data) {
  var stats = $('stats');
  stats.innerHTML = '';
  var start = this.toIndex(data, this.startMonth);
  var end = this.toIndex(data, this.endMonth);

  for (var i = 0; i < data.statFuncs.length; i++) {
    var result = data.statFuncs[i](data.vals, start, end);

    var title = document.createElement("strong");
    title.appendChild(document.createTextNode(result[0]));
    var content = document.createElement("div");
    content.appendChild(document.createTextNode(result[1]));
    content.className = "num";

    var statNode = document.createElement("div");
    statNode.appendChild(title);
    statNode.appendChild(document.createElement("br"));
    statNode.appendChild(content);
    statNode.appendChild(document.createElement("br"));

    stats.appendChild(statNode);
  };
},

toIndex: function (data,n) {
  return Math.floor(n/data.pointJump);
},

calcRange: function (data, start, end) {
  var min = Infinity;
  var max = 0.0;
  for (var i = start; i < end; i++) {
    if(data.vals[i]>max) max = data.vals[i];
    if(data.vals[i]<min) min = data.vals[i];
  };
  return [min, max];
},

calcCurRange: function (data, opt) {
  var start = this.toIndex(data, this.startMonth);
  var end = this.toIndex(data, this.endMonth);
  var res = this.calcRange(data, start, end);
  opt.min = res[0];
  opt.max = res[1];
},

draw: function () {
  if(!this.mainData) return;
  this.ctx.clearRect(0,0,this.width, this.height);

  this.updateTimeFields();

  this.drawLines(this.bigGraph, this.startMonth, this.endMonth);
  this.calcCurRange(this.mainData, this.bigGraph);
  this.drawData(this.mainData, this.bigGraph, this.startMonth, this.endMonth);

  // scrub graph
  //this.drawLines(this.scrubGraph, 0, this.maxMonth);
  this.drawData(this.mainData, this.scrubGraph, 0, this.maxMonth);
  this.drawWindow(this.scrubGraph);

  this.updateStats(this.mainData);
},

drawLines: function(opt, startMonth, endMonth){
  var ctx = this.ctx;
  var span = endMonth-startMonth;
  var dx = (opt.width/span);

  var minSpace = 20;
  var alpha = Math.min((dx*12)/minSpace*0.7,0.7);
  if (alpha < 0.3 || !opt.yearLabels) alpha = 0.0;

  ctx.lineWidth = 1;
  ctx.textAlign = "center";
  ctx.font = "10pt Arial";
  ctx.fillStyle = "rgb(130,130,130)";

  for (var i = startMonth; i < endMonth; i++) {
    if (i % 12 == 0) {
      var x = (i-startMonth)*dx;
      var curYear = Math.floor(this.firstYear + i/12)
      var isDecade =  curYear % 10 == 0;

      if(isDecade) {
        ctx.strokeStyle = "rgb(200,200,200)";
      } else {
        ctx.strokeStyle = "rgba(225,225,225,"+alpha+")";
      }

      ctx.beginPath();
      ctx.moveTo(x,opt.lineTop);
      ctx.lineTo(x,opt.bottom);
      ctx.stroke();

      if(isDecade && opt.decadeLabels) {
        ctx.fillText(curYear, x, opt.bottom + 15);
      }
    }
  }
},

drawData: function (data, opt, startMonth, endMonth){
  var ctx = this.ctx;
  var start = this.toIndex(data, startMonth);
  var end = this.toIndex(data, endMonth);
  var span = end-start;
  var dx = (opt.width/span);
  var jump = (data.pointJump == 1) ? Math.ceil(span/opt.width) : 1;

  // Graph
  ctx.strokeStyle = opt.color;
  ctx.lineWidth = opt.lineWidth;
  ctx.lineJoin = "round";

  ctx.beginPath();
  var graphHeight = opt.bottom - opt.top;
  var y1 = (data.vals[start]-opt.min)/(opt.max-opt.min)*graphHeight;
  ctx.moveTo(0,opt.bottom - y1);
  for (var i = start; i < end; i+=jump) {
    var y = (data.vals[i]-opt.min)/(opt.max-opt.min)*graphHeight;
    var x = (i-start)*dx;
    ctx.lineTo(x,opt.bottom - y);
  };
  ctx.stroke();
},

drawSep: function(opt) {
  var ctx = this.ctx;
  ctx.lineWidth = 6;
},

drawWindow: function(opt) {
  this.ctx.fillStyle = opt.windowColor;

  var x1 = this.startMonth/this.maxMonth*opt.width;
  var x2 = this.endMonth/this.maxMonth*opt.width;
  this.ctx.fillRect(x1, opt.top, x2-x1, opt.bottom-opt.top);
}
};
