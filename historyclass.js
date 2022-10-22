
// version 0.0.2 - march 2020
function History_class(divs, funcs) {
  this.initialize(divs, funcs);
}
History_class.prototype.initialize = function (divs, funcs) {
  let that=this;
  const REQUIRED_DIVS = ['main','searchBox','searchbutton']
  REQUIRED_DIVS.forEach((item) => {if (!divs[item]) throw new Error("Need a "+item+" div to imnitialise" )});
  this.divs = divs;

  const REQUIRED_FUNCS = ['search','showWarning']
  REQUIRED_FUNCS.forEach((item) => {if (!funcs[item]) throw new Error("Need a "+item+" function to imnitialise" )});
  this.funcs = funcs;

  this.HISTORY_SEARCH_STATE_INIT = {
    itemsfetched:0,
    last_words_searched:'',
    more_items:20,
    allresults:[]
  };
  this.history_search = null;
  this.current = {}

  dg.el(divs.searchBox).onkeydown= function (evt) {
    if (evt.keyCode == 13 || evt.keyCode == 32 || evt.keyCode == 9) {
        if (evt.keyCode == 13 || evt.keyCode == 9) evt.preventDefault();
        that.doSearch();
    }
  }
  dg.el(divs.searchbutton).onclick= function (evt) {
    that.doSearch();
  }

};

const MCSS = {
  LIGHT_GREY: "rgb(151, 156, 160)"
}

History_class.prototype.init_state= function(){
  //onsole.log("INIT STATE")
  const historydiv = dg.el(this.divs.main,{clear:true});
  this.history_search = JSON.parse(JSON.stringify(this.HISTORY_SEARCH_STATE_INIT)) //Object.assign({},SEARCH_STATE_INIT)
}
History_class.prototype.clear_search = function() {
  this.init_state()
  dg.el(this.divs.searchBox).textContent=''
  this.doSearch();
}
History_class.prototype.doSearch = function (reinit) {
  let searchTerms = this.utils.removeSpacesEtc(dg.el(this.divs.searchBox).textContent)
  if (this.history_search.last_words_searched!=searchTerms || reinit) this.init_state();
  this.history_search.last_words_searched=searchTerms;

  var query_params = {
      words   : ((searchTerms && searchTerms.length>0)? searchTerms.split(" "):[]),
      skip    : this.history_search.itemsfetched,
      count   : this.history_search.more_items
  }
  const that=this;
  this.funcs.search(query_params, function(response) {
    console.log(response)
    console.log(response.length)
      if (!response || response.error) {
          showWarning("Error trying to do backgroundLocalSearch");
      } else if (response.length>0 || that.history_search.allresults.length==0){
        // {success:true, results:results, nomore: current_item==0}
        that.history_search.allresults.push(response)
        that.history_search.nomore = response.length<query_params.count
        that.history_search.itemsfetched+= response.length
        dg.el(that.divs.main,{clear:true,top:true}).appendChild(that.drawItems(response,that.history_search.allresults.length, that.history_search.nomore));
      }
  });
}
History_class.prototype.drawItems = function (results, page, nomore) {
  let that = this;
  let recentdate
  let resultsdiv=dg.div(
    {style:{'margin-bottom':'20px','padding-left':'5px'}},
  )
  if (results && results.length>0){
    results.forEach(alog => {
      let thisdate = new Date(alog.vulog_timestamp).toDateString()
      if (thisdate != recentdate) {
        recentdate=thisdate;
        resultsdiv.appendChild(
          dg.div(
            {style:{'font-size':'18px',color:'indianred','margin-top':'40px'}
            },
            (thisdate)
          )
        )
      }
      resultsdiv.appendChild(this.drawItem(alog))
    });
  }

  more_hist = dg.el(this.divs.more_menu,{clear:true});
  if (this.history_search.allresults.length>1) {
    more_hist.appendChild(dg.span("Pages:"))
    for (let i=0; i<this.history_search.allresults.length; i++) {
      if (page==i) {
        more_hist.appendChild(dg.span(" .. "))
      } else {
        more_hist.appendChild(dg.span({
          style:{color:'cornflowerblue',cursor:'pointer','margin-right':'3px'},
          onclick:() => dg.el(that.divs.main,{clear:true,top:true}).appendChild(that.drawItems(that.history_search.allresults[i],i, nomore))
        },(" "+(i+1)+" ")))
      }
    }
    more_hist.appendChild(dg.span({style:{'margin-right':'20px'}},' '))
  }
  if (nomore) {
    more_hist.appendChild(dg.span({style:{'margin-left':'20px',color:CSS.LIGHT_GREY}},' No more items'))
  } else {
    more_hist.appendChild(dg.span({
      style:{color:'cornflowerblue',cursor:'pointer','margin-left':'20px'},
      onclick:function() {that.doSearch()}
    },'More items'))
  }
  return resultsdiv

}
History_class.prototype.drawItem = function (alog) {
  itemdiv=dg.div({style:{'margin-top':'10px'}})
  //onsole.log(alog)

  // Top line
  let timeString = (new Date(alog.vulog_timestamp).toTimeString()).split(":")
  timeString = timeString[0]+":"+timeString[1]
  itemdiv.appendChild( dg.span(
    dg.span( // time
      {style:{
        color: CSS.LIGHT_GREY,
        width: '45px',
        'font-size': '14px',
        'vertical-align': 'middle',
      }},
      timeString
    ),
    dg.span( // favicon
      //{style:{'max-width':'15px'}},
      dg.img({
        style:{
          'vertical-align': 'middle',
          width: '15px',
          height: '15px',
          'margin-left': '5px',
          'margin-right': '5px',
        },
        src:(alog.vulog_favIconUrl? alog.vulog_favIconUrl : (this.utils.getdomain(alog.url)+"/favicon.ico")),
        onerror:function(){
          this.onerror = null;
          this.src= 'images/favicon_www.png';
        }
      })
    ),
    dg.a({
        style:{
          overflow: "hidden",
          "text-overflow": "ellipsis",
          'font-weight':'bold',
          'font-size': '14px',
          cursor: 'pointer',
          width: '500px',
          height: '18px',
          display: 'inline-block',
          'vertical-align': 'top',
        },
        href:alog.url,
        target:'_blank'
      },
      (alog.title? (alog.domainApp+" - "+alog.title): alog.url)
    )
  ))

  itemdiv.appendChild(this.draw_detail_header(alog));
  //
  itemdiv.appendChild(this.draw_detailsdiv(alog));

  return itemdiv


}
History_class.prototype.count_trackers = function (alog) {
  return [null, null, null]
}
History_class.prototype.draw_detail_header = function (alog) {
  let that=this;
  alog.vulog_visit_details = alog.vulog_visit_details || []
  reducerArray = [0, ...alog.vulog_visit_details]
  let time_spent = reducerArray.reduce(function(total, obj) {
    let end = obj.end || obj.mid
    let newdiff = (end && !isNaN(end) && obj.start && !isNaN(obj.start))? (end - obj.start):0
    return total + newdiff
  });
  let [ttl_cookies, tracker_num, tracker_visits] = that.count_trackers(alog)
  let thediv = dg.div(
    {style:{
        'margin-left':'60px',
        cursor: 'pointer',
        color: CSS.LIGHT_GREY,
      },
      onclick:function(evt) {
        const blocktotoggle = this.nextSibling;
        var isExpanded = that.utils.toggleCollapse(blocktotoggle);
        let arrow = evt.target.className.includes('fa-chevron')? evt.target:evt.target.firstChild;
        arrow.className =  isExpanded? ("fa-chevron-down hist_details_expanded"): ("fa-chevron-right  hist_details_collapse")
      }
    },
    dg.span({className:'fa-chevron-right hist_details_collapse',
            style:{color:(alog._id? "green":"cornflowerblue")}}),

    ((time_spent? ("Est. time "+ this.utils.timeSpentify(time_spent)+" - "):"") +
     (alog.vulog_max_scroll? "Scroll:"+Math.round(100*alog.vulog_max_scroll/alog.vuLog_height)+"% ": "") +
     ((ttl_cookies || tracker_num)?("Left "+ttl_cookies+" cookies, using "+tracker_num+" tracker"+(tracker_num!=1?"s":"") +" - "):"")
     +"See details"
    )
  )
  return thediv;
}
History_class.prototype.draw_detailsdiv = function(alog){
  let that=this;
  let detailsdiv = dg.div({style:{
      color:CSS.LIGHT_GREY,
      'font-size':'10px',
      'padding-left':'65px',
      height:'0px',
      overflow:'hidden',
      transition:'height 0.3s ease-out'
    }},dg.div(dg.b("Full url: "),alog.url))
  if (alog.author) detailsdiv.appendChild(dg.div(dg.b("By: "),alog.author ))
  if (alog.description) detailsdiv.appendChild(dg.div(dg.b("Summary: "),alog.description))
  if (alog.keywords && alog.keywords.length>0) detailsdiv.appendChild(dg.div(dg.b("Key words: "),alog.description ))
  const vtime = function(time) {return new Date(time).toLocaleTimeString().split(' ')[0]}
  const wtime = function(time) {
    mins = Math.round(time/60000);
    return ( (mins? (mins+"m "):"")+Math.round((time%60000)/1000)+"s");
  }
  alog.vulog_visit_details.forEach(visit => detailsdiv.appendChild(dg.div(dg.b("Visited "),"from ",vtime(visit.start)," to ",vtime(visit.end || visit.mid),(visit.vid_start? (" - Watched Video for "+wtime((visit.end || visit.mid)-visit.vid_start)):""  ))))

  detailsdiv.appendChild(dg.div(
    dg.span({style:{color:'cornflowerblue', 'margin-right':'10px', cursor:'pointer'},
     onclick: function(e) {
       that.funcs.removeLocalItem(alog, function(error, response) {
         //onsole.log(response)
         if (error || !response || !response.success) {
           showWarning("Error removing item - "+(response?response.error:""))
         } else {
           that.utils.toggleCollapse(e.target.parentElement.parentElement);
           setTimeout(function(){e.target.parentElement.parentElement.parentElement.style.display="none"},280)
           if (response.otherSimilar && response.otherSimilar.length>0) {
             showWarning("Item was deleted. But note that there are "+response.otherSimilar.length+" other items with the same url still remaining",5000)
           }
         }
       })
    }},
    "Remove from history logs ")
  ))

  return detailsdiv
}


History_class.prototype.utils = {
  removeSpacesEtc : function(aText) {
      aText = aText.replace(/&nbsp;/g," ").trim();
      aText = aText.replace(/\//g," ").trim();
      aText = aText.replace(/,/g," ").trim();
      aText = aText.replace(/\:/g," ").trim();
      aText = aText.replace(/\-/g," ").trim();
      aText = aText.replace(/\./g," ").trim();
      while (aText.indexOf("  ")>-1) {
          aText = aText.replace(/  /," ");
      }
      return aText.toLowerCase();
  },
  timeSpentify: function (aTime) {
      //
      return (Math.floor(aTime/60000)>0? (Math.floor(aTime/60000)+"mins" ):"" )+(Math.round((aTime%60000)/1000,0))+"s"
  },
  getdomain: function(aUrl) {
      if(!aUrl) return "Missing aUrl";
      var start = aUrl.indexOf("//")+2
      var stop = aUrl.slice(start).indexOf("/");
      return aUrl.slice(0,stop+start);
  },
  toggleCollapse: function(element) {
    function collapseSection(element) {
      // from css-tricks.com/using-css-transitions-auto-dimensions/
      var sectionHeight = element.scrollHeight;
      var elementTransition = element.style.transition;
      element.style.transition = '';
      requestAnimationFrame(function() {
        element.style.height = sectionHeight + 'px';
        element.style.transition = elementTransition;
        requestAnimationFrame(function() {
          element.style.height = 0 + 'px';
        });
      });
    }
    function expandSection(element) {
      // from css-tricks.com/using-css-transitions-auto-dimensions/
      var sectionHeight = element.scrollHeight || 'auto';
      element.style.height = (sectionHeight + 'px');
      element.addEventListener('transitionend', function(e) {
        element.removeEventListener('transitionend', arguments.callee);
        element.style.height = null;
      });
    }
    var wasCollapsed = !element.getAttribute('data-collapsed') || element.getAttribute('data-collapsed') === 'false';
    if(wasCollapsed) {
      expandSection(element)
      element.setAttribute('data-collapsed', 'true')
    } else {
      collapseSection(element)
      element.setAttribute('data-collapsed', 'false')
    }
    return wasCollapsed // ie it is now expanded
  }
}
