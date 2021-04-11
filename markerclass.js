
// version 0.0.1 - april 2020

function Marker_class(divs, funcs) {
  this.initialize(divs, funcs);
}
Marker_class.prototype.initialize = function (divs, funcs) {
  let that=this;
  const REQUIRED_DIVS = ['main','filterstarbeg','searchBox','searchbutton','more_menu']
  REQUIRED_DIVS.forEach((item) => {if (!divs[item]) throw new Error("Need a "+item+" div to imnitialise" )});
  this.divs = divs;

  const REQUIRED_FUNCS = ['search','showWarning']
  REQUIRED_FUNCS.forEach((item) => {if (!funcs[item]) throw new Error("Need a "+item+" function to imnitialise" )});
  this.funcs = funcs;

  this.MAIN_STARS = ["bookmark", "star", "inbox", "bullhorn"]
  this.XTRA_STARS = ["tags","sticky-note","quote-left","quote-right"]
  this.MAIN_STARS.forEach(aStar =>{
      dg.el(this.divs.filterstarbeg+aStar).onclick = function(){
        // console.log('toggling '+aStar)
          that.toggleFilterStar(aStar)}
  });

  this.MARK_SEARCH_STATE_INIT = {
    itemsfetched:0,
    last_words_searched:'',
    more_items:20,
    allresults:[],
    star_filters:[]
  };
  this.mark_search = null;
  this.current = {}
  this.urlwin = null

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

dg.addAttributeException('db_id')
dg.addAttributeException('fj_id')
dg.addAttributeException('purl')


Marker_class.prototype.init_state= function(){
  // onsole.log("INIT STATE")
  const markdiv = dg.el(this.divs.main,{clear:true});
  this.mark_search = JSON.parse(JSON.stringify(this.MARK_SEARCH_STATE_INIT)) //Object.assign({},this.MARK_SEARCH_STATE_INIT)
}
Marker_class.prototype.clear_search= function() {
  this.init_state()
  this.MAIN_STARS.forEach(aStar =>{
    dg.el(this.divs.filterstarbeg+aStar).className = "fa fa-"+aStar+" stars unchosen-star"
  });

  dg.el(this.divs.searchBox).textContent=''
  this.doSearch();
}
Marker_class.prototype.doSearch = function (reinit) {
  let searchTerms = this.utils.removeSpacesEtc(dg.el(this.divs.searchBox).textContent)
  if (this.mark_search.last_words_searched!=searchTerms || reinit) this.init_state();
  this.mark_search.last_words_searched=searchTerms;
  this.mark_search.star_filters = []
  this.MAIN_STARS.forEach(aStar => {if (dg.el(this.divs.filterstarbeg+aStar).className.includes(" chosen-star")) this.mark_search.star_filters.push(aStar)} );

  var query_params = {
      words   : ((searchTerms && searchTerms.length>0)? searchTerms.split(" "):[]),
      star_filters   : this.mark_search.star_filters,
      skip    : this.mark_search.itemsfetched,
      count   : this.mark_search.more_items,

  }
  const that=this;
  this.funcs.search(query_params, function(response) {
      console.log('search repsonse ',response)
      if (!response || response.error) {
          showWarning("Error trying to do search");
      } else if (response.length>0 || that.mark_search.allresults.length==0) {
        that.mark_search.allresults.push(response)
        that.mark_search.nomore = response.length<query_params.count
        that.mark_search.itemsfetched+= response.length
        dg.el(that.divs.main,{clear:true,top:true}).appendChild(marks.drawItems(response,that.mark_search.allresults.length, that.mark_search.nomore));
      }
  });
}
Marker_class.prototype.drawItems = function (results, page, nomore) {
  let that = this;
  let resultsdiv=dg.div(
    {style:{'margin-bottom':'20px','padding-left':'5px'}},
  )
  if (results && results.length>0){
    results.forEach(alog => {
      resultsdiv.appendChild(this.drawItem(alog))
    });
  }

  more_hist = dg.el(this.divs.more_menu,{clear:true});
  if (this.mark_search.allresults.length>1) {
    more_hist.appendChild(dg.span("Pages:"))
    for (let i=0; i<this.mark_search.allresults.length; i++) {
      if (page==i) {
        more_hist.appendChild(dg.span(" .. "))
      } else {
        more_hist.appendChild(dg.span({
          style:{color:'cornflowerblue',cursor:'pointer','margin-right':'3px'},
          onclick:() => dg.el(that.divs.main,{clear:true,top:true}).appendChild(marks.drawItems(that.mark_search.allresults[i],i, nomore))
        },(" "+(i+1)+" ")))
      }
    }
    more_hist.appendChild(dg.span({style:{'margin-right':'20px'}},' '))
  }
  if (nomore) {
    more_hist.appendChild(dg.span({style:{'margin-left':'20px',color:MCSS.LIGHT_GREY}},' No more items stored locally'))
    if (false && freezrMeta.adminUser) {more_hist.appendChild(dg.span({style:{'margin-left':'20px',color:'cornflowerblue',cursor:'pointer'},
      onclick:function(){
        console.log("todo - find online")
      }
    },
    'Get more online items'))}
  } else {
    more_hist.appendChild(dg.span({
      style:{color:'cornflowerblue',cursor:'pointer','margin-left':'20px','padding-bottom':'20px'},
      onclick:function() {marks.doSearch()}
    },'More items'))
  }
  return resultsdiv
}

Marker_class.prototype.drawItem = function (alog) {
  itemdiv=dg.div({style:{'margin-top':'10px'}})
  //onsole.log(alog)
  let that=this;
  let favicon = dg.img({
    style:{
      'vertical-align': 'middle',
      width: '15px',
      height: '15px',
      'margin-left': '5px',
      'margin-right': '5px',
    },
    src:(alog.vulog_favIconUrl? alog.vulog_favIconUrl : (this.utils.getdomain(alog.url)+"/favicon.ico")),
  })
  favicon.onerror = function(evt){
    this.onerror = null;
    this.src= (window.location.href.indexOf('http')==0)? 'public/static/favicon_www.png':'favicon_www.png';
  }

  itemdiv.appendChild( dg.span(
    dg.span( // favicon
      //{style:{'max-width':'15px'}},
      favicon
    ),
    dg.span({
    //dg.a({
        style:{
          overflow: "hidden",
          "text-overflow": "ellipsis",
          'font-weight':'bold',
          'font-size': '14px',
          cursor: 'pointer',
          'max-width': '500px',
          height: '18px',
          display: 'inline-block',
          'vertical-align': 'top',
          color:'darkgrey',
        },

        onclick: function() {
          let left = window.screenLeft != undefined ? window.screenLeft : window.screenX;
          let top = window.screenTop != undefined ? window.screenTop : window.screenY;
          let height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
          that.urlwin = window.open(alog.url,"window","width=800, height="+height+",  left ="+(left+500)+", top="+top)//toolbar=0, menubar=0,
        }
      },
      (alog.title? (alog.domain_app+" - "+alog.title): alog.url)
    )
  ))

  // Stars / top header
  let toptag = dg.div(
    {style:{'margin-left':'30px' } },
    dg.span({className:'fa-chevron-right hist_details_collapse',
            style:{cursor: 'pointer', color:(alog._id? "green":"cornflowerblue"),'padding-right':'10px'},
            onclick:function(evt) {
              const blocktotoggle = this.parentElement.nextSibling;
              var isExpanded = that.utils.toggleCollapse(blocktotoggle);
              let arrow = evt.target.className.includes('fa-chevron')? evt.target:evt.target.firstChild;
              arrow.className =  isExpanded? ("fa-chevron-down hist_details_expanded"): ("fa-chevron-right  hist_details_collapse")
            }
    })
  )
  let topstars = [...this.XTRA_STARS, ...this.MAIN_STARS]
  let chosenstars = (alog.vulog_highlights && alog.vulog_highlights.length>0)? ["quote-left","quote-right"]:[]
  chosenstars = alog.vulog_mark_stars?[...chosenstars , ...alog.vulog_mark_stars]:chosenstars;
  if (alog.vulog_mark_tags && alog.vulog_mark_tags.length>0) chosenstars.push("tags")
  if (alog.vulog_mark_notes && alog.vulog_mark_notes.length>0) chosenstars.push("sticky-note")
  topstars.forEach(aStar => {
    let chosen = (chosenstars.includes(aStar))? "chosen":"unchosen";
    let changable = this.MAIN_STARS.includes(aStar)
    toptag.appendChild(dg.span({
      className: 'fa fa-'+aStar+' littlestars '+chosen+'-star',
      style:{cursor:(changable?'pointer':'cursor')},
      dgdata:changable,
      purl:((changable)?alog.purl:null),
      db_id:((changable && alog._id)?alog._id:null),
      fj_id:((changable && alog.fj_local_temp_unique_id)?alog.fj_local_temp_unique_id:null),
      onclick:function(e){
        if (changable) {
          that.funcs.mark_star({
            purl: this.getAttribute('purl'),
            id: (this.getAttribute('db_id') || this.getAttribute('fj_id')),
            theStar:aStar,
            doAdd:(chosen=="unchosen")
          }, function(response) {
            console.log('did op and got ', {response})
            if (!response || response.error) {
              showWarning((response && response.error)? (response.error.error || response.error): "Error changing mark.")
            } else {
              chosen = ((chosen=="unchosen")?"chosen":"unchosen")
              e.target.className = 'fa fa-'+aStar+' littlestars '+(chosen)+'-star';
            }
          })
        }
      }
    }))
    if (aStar !="quote-left") toptag.appendChild(dg.span({style:{'margin-left':'10px'}}," "))
  })

  itemdiv.appendChild(toptag)

  let detailsdiv = dg.div({style:{
      'padding-left':'45px',
      height:'0px',
      overflow:'hidden',
      transition:'height 0.3s ease-out',
      'max-width': '700px'
    }},
    dg.div({style:{'margin-top':'3px', color:'darkgray'}},
      dg.div({style:{'height':'16px','overflow':'hidden','text-overflow':'ellipsis'}},"url: ",dg.a({href:alog.purl,target:'_blank'},alog.purl)),
      dg.div("Created: "+ (new Date (alog.vulog_timestamp).toLocaleDateString() + " "+new Date (alog.vulog_timestamp).toLocaleTimeString() +" (Modified: "+(new Date (alog._date_modified || alog.fj_modified_locally).toLocaleDateString())+")")),
      dg.div({style:{'height':'16px','overflow':'hidden','text-overflow':'ellipsis',display:(alog.referrer?'block':'none')}},
          "referrer: ",dg.a({href:alog.referrer,target:'_blank'},alog.referrer))
    )
  )

  if (alog.description) {
    detailsdiv.appendChild(dg.div(
      {style:{'margin-bottom':'3px', color:'darkgray'}},
      alog.description
    ))
  }
  if (alog.vulog_mark_tags && alog.vulog_mark_tags.length>0) {
    detailsdiv.appendChild(dg.div(
      {style:{'color':'darkgrey'}},
      "Tags: ",
      dg.span({style:{'color':'indianred','font-weight':'bold'}},(alog.vulog_mark_tags.join(", "))),
      "."
    ))
  }
  if (alog.vulog_mark_notes) {
    detailsdiv.appendChild(dg.div(
      {style:{'color':'darkgrey','margin-bottom':'3px'}},
      "Notes: ",
      dg.span(
      {style:{'color':'indianred','font-weight':'bold'}},
      alog.vulog_mark_notes)
    ))
  }
  if (alog.vulog_highlights && alog.vulog_highlights.length>0) {
    alog.vulog_highlights.forEach((item, i) => detailsdiv.appendChild(marks.drawHighlight(item, {include_delete:false, show_display_errs:false})));
  }

  itemdiv.appendChild(detailsdiv)

  return itemdiv


}
Marker_class.prototype.toggleFilterStar = function(theStar) {
  var starDiv = dg.el(this.divs.filterstarbeg+theStar);
  var starIsChosen = (starDiv && starDiv.className.indexOf("unchosen")<0);
  if (!theStar || !starDiv) {
      console.warn("Error - no stars")
      showWarning("internal error - no stars",theStar)
  } else {
    starDiv.className = "fa fa-"+theStar+" stars "+(starIsChosen?"un":"")+"chosen-star";
    this.init_state();
    marks.doSearch();
  }
}
Marker_class.prototype.drawHighlight = function(item, options) {
  let deleter = dg.div({}), display_err=dg.div({});
  if (options.include_delete) {
    deleter = dg.div({
      className:'del_quote',
      onclick:function(e) {
        let h_date = this.getAttribute('highlight-date')
        this.funcs.deleteHighlight({msg: "deleteHighlight", purl:this.current.purl , h_date:h_date}, function(response) {})
      },
      style:{display:'none'}}, "Click to remove quote")
    deleter.setAttribute('highlight-date', item.h_date)
  }
  if (options.show_display_errs && item.display_err) {
    display_err=dg.div({className:'quote_display_err'},
      'This quote was not found and so it is not highlighted on the page')
  }
  return dg.div({className:"quote_outer"},
    dg.span({className:"quote_left"}),
    dg.span({className:"quote_inner"},
      dg.span({style:{cursor:(options.include_delete?'pointer':'cursor')},ondblclick:function(e){
          if (options.include_delete) {
            e.target.style['color']=(e.target.style['color']=='yellow'?"white":"yellow")
            dg.toggleShow (e.target.parentElement.nextSibling.nextSibling)
          }
        }}, item.string
      ),
    display_err),
    dg.span({className:"quote_right"}),

    deleter
  )
}

Marker_class.prototype.utils = {
  removeSpacesEtc : function(aText) {
      aText = aText.replace(/&nbsp;/g," ").trim();
      aText = aText.replace(/\//g," ").trim();
      aText = aText.replace(/,/g," ").trim();
      aText = aText.replace(/\:/g," ").trim();
      aText = aText.replace(/\./g," ").trim();
      aText = aText.replace(/\-/g," ").trim();
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
