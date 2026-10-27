const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const STORAGE_KEY = "consistify_demo_v1";
const palette = ["#6f98ff","#bd79f4","#48d7ad","#ffb765","#f27ba8","#69c9e8"];
let state = loadState();
let authMode = "signup", authStep = "account", currentView = "dashboard", taskFilter = "all";
let calendarDate = new Date(); calendarDate.setDate(1);
let toastTimer;

function loadState(){try{const saved=localStorage.getItem(STORAGE_KEY);return saved?JSON.parse(saved):{user:null,groups:[],activeGroupId:null};}catch{return {user:null,groups:[],activeGroupId:null};}}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function uid(){return Math.random().toString(36).slice(2,9).toUpperCase();}
function todayKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
function activeGroup(){return state.groups.find(g=>g.id===state.activeGroupId)||null;}
function currentMember(){const g=activeGroup();return g?.members.find(m=>m.id===state.user?.id)||null;}
function userInitial(name){return (name||"?").trim().charAt(0).toUpperCase();}
function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600);}
function showModal(id){$("#"+id).classList.remove("hidden");document.body.style.overflow="hidden";}
function closeModals(){$$(".modal-backdrop").forEach(m=>m.classList.add("hidden"));document.body.style.overflow="";}
function setPage(which){const landing=which==="landing";$("#landingPage").classList.toggle("active",landing);$("#appPage").classList.toggle("active",!landing);$("#siteFooter").classList.toggle("hidden",!landing);$("#mainNav").classList.toggle("hidden",!landing);$("#topActions").classList.toggle("hidden",!landing);if(!landing)renderApp();window.scrollTo({top:0,behavior:"smooth"});}
function showAuth(mode){authMode=mode;authStep="account";renderAuth();showModal("authModal");}
function renderAuth(){
 const c=$("#authContent");
 if(authStep==="create"||authStep==="join"){
   const create=authStep==="create";
   c.innerHTML=`<div class="auth-heading"><div class="eyebrow">${create?"START YOUR COMMUNITY":"JOIN YOUR PEOPLE"}</div><h2>${create?"Create a private group":"Join a group"}</h2><p>${create?"You'll be the group admin and can invite your members.":"Enter the invite code shared by your group admin."}</p></div>
   <form id="groupAuthForm">${create?`<label for="newGroupName">Community name</label><input id="newGroupName" maxlength="40" placeholder="e.g. The Consistency Club" required><label for="groupDescription">What are you working on? (optional)</label><input id="groupDescription" maxlength="90" placeholder="Study, fitness, coding...">`:`<label for="joinCode">Invite code</label><input id="joinCode" maxlength="12" placeholder="e.g. AB12CD" required style="text-transform:uppercase;letter-spacing:2px">`}
   <div class="form-actions"><button type="button" class="btn btn-outline" id="backAuth">Back</button><button class="btn btn-primary" type="submit">${create?"Create group":"Join group"} ↗</button></div></form>`;
   $("#backAuth").onclick=()=>{authStep="account";renderAuth();};$("#groupAuthForm").onsubmit=create?createGroup:joinGroup;return;
 }
 c.innerHTML=`<div class="auth-heading"><div class="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h2>${authMode==="signup"?"Create your account":"Welcome back."}</h2><p>${authMode==="signup"?"Set up your profile, then create or join a private community.":"Log in to return to your communities."}</p></div>
 <div class="auth-tabs"><button class="${authMode==="signup"?"active":""}" data-authmode="signup">Sign up</button><button class="${authMode==="login"?"active":""}" data-authmode="login">Log in</button></div>
 <form id="accountForm"><label for="authName">Your name</label><input id="authName" maxlength="35" placeholder="What should we call you?" autocomplete="name" required>
 <label for="authEmail">Email address</label><input id="authEmail" type="email" placeholder="you@example.com" autocomplete="email" required>
 <label for="authPassword">Password</label><input id="authPassword" type="password" minlength="4" placeholder="At least 4 characters in this demo" required>
 <button class="btn btn-primary full-width" type="submit">${authMode==="signup"?"Create account":"Log in"} ↗</button></form>
 <p class="form-hint" style="margin-top:13px">Demo only: this prototype stores sample account data in this browser. Do not use a real password.</p>`;
 $$("[data-authmode]",c).forEach(b=>b.onclick=()=>{authMode=b.dataset.authmode;renderAuth();});
 $("#accountForm").onsubmit=handleAccount;
}
function handleAccount(e){
 e.preventDefault();const name=$("#authName").value.trim(),email=$("#authEmail").value.trim().toLowerCase(),password=$("#authPassword").value;
 if(password.length<4){toast("Please enter at least 4 characters for this demo.");return;}
 let user=state.users?.find(u=>u.email===email);
 if(authMode==="signup"){
   if(user){toast("That email already exists in this demo. Try logging in.");return;}
   user={id:uid(),name,email,passwordDemo:password};state.users=[...(state.users||[]),user];state.user={id:user.id,name:user.name,email:user.email};
   authStep="create";renderAuth();saveState();return;
 }
 if(!user||user.passwordDemo!==password){toast("Demo login didn't match. Sign up first in this browser.");return;}
 state.user={id:user.id,name:user.name,email:user.email};
 const joined=state.groups.filter(g=>g.members.some(m=>m.id===user.id));
 if(joined.length){state.activeGroupId=joined[0].id;saveState();closeModals();setPage("dashboard");toast("Welcome back, "+user.name+"!");}
 else{authStep="create";renderAuth();saveState();}
}
function createGroup(e){
 e.preventDefault();if(!state.user)return;const name=$("#newGroupName").value.trim();if(!name)return;
 const group={id:uid(),name,description:$("#groupDescription").value.trim(),inviteCode:uid().slice(0,6),adminId:state.user.id,createdAt:todayKey(),members:[{id:state.user.id,name:state.user.name,role:"admin",joinedAt:todayKey()}],tasks:defaultTasks(),records:{},activity:[]};
 state.groups.push(group);state.activeGroupId=group.id;saveState();closeModals();setPage("dashboard");toast("Your private group is ready. Invite code: "+group.inviteCode);
}
function joinGroup(e){
 e.preventDefault();const code=$("#joinCode").value.trim().toUpperCase();const g=state.groups.find(x=>x.inviteCode===code);
 if(!g){toast("Invite code not found in this browser demo.");return;}
 if(g.members.some(m=>m.id===state.user.id)){state.activeGroupId=g.id;saveState();closeModals();setPage("dashboard");toast("You're already a member of this group.");return;}
 if(g.members.length>=50){toast("This demo group has reached its 50-member limit.");return;}
 g.members.push({id:state.user.id,name:state.user.name,role:"member",joinedAt:todayKey()});state.activeGroupId=g.id;saveState();closeModals();setPage("dashboard");toast("Welcome to "+g.name+"!");
}
function defaultTasks(){return [
 {id:uid(),name:"Physics",category:"Study",points:10,createdBy:"admin",createdAt:todayKey()},
 {id:uid(),name:"Chemistry",category:"Study",points:10,createdBy:"admin",createdAt:todayKey()},
 {id:uid(),name:"Biology",category:"Study",points:10,createdBy:"admin",createdAt:todayKey()},
 {id:uid(),name:"Maths",category:"Study",points:10,createdBy:"admin",createdAt:todayKey()}
];}
function ensureRecord(g,memberId,date=todayKey()){g.records[date]??={};g.records[date][memberId]??={done:[]};return g.records[date][memberId];}
function isDone(g,memberId,taskId,date=todayKey()){return ensureRecord(g,memberId,date).done.includes(taskId);}
function memberPoints(g,memberId,date=todayKey()){return g.tasks.reduce((sum,t)=>sum+(isDone(g,memberId,t.id,date)?Number(t.points):0),0)+(allTasksDone(g,memberId,date)?10:0);}
function allTasksDone(g,memberId,date=todayKey()){return g.tasks.length>0&&g.tasks.every(t=>isDone(g,memberId,t.id,date));}
function totalPoints(g,memberId){return Object.keys(g.records).reduce((sum,d)=>sum+memberPoints(g,memberId,d),0);}
function allMemberTotal(g,memberId){return totalPoints(g,memberId);}
function groupPointsToday(g){return g.members.reduce((sum,m)=>sum+memberPoints(g,m.id),0);}
function toggleTask(taskId){
 const g=activeGroup(),m=currentMember();if(!g||!m)return;const t=g.tasks.find(t=>t.id===taskId);if(!t)return;
 const r=ensureRecord(g,m.id);const done=r.done.includes(taskId);
 r.done=done?r.done.filter(id=>id!==taskId):[...r.done,taskId];
 g.activity.unshift({id:uid(),memberId:m.id,memberName:m.name,taskName:t.name,points:done?0:Number(t.points),date:todayKey(),time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),undone:done});g.activity=g.activity.slice(0,60);
 saveState();renderApp();toast(done?"Completion removed.":"Nice work! Task completed.");
}
function addTask(e){e.preventDefault();const g=activeGroup();if(!g)return;const name=$("#taskName").value.trim(),category=$("#taskCategory").value,points=Number($("#taskPoints").value);if(!name||!Number.isFinite(points)||points<1||points>100){toast("Enter a task name and points between 1 and 100.");return;}g.tasks.push({id:uid(),name,category,points,createdBy:state.user.id,createdAt:todayKey()});saveState();$("#taskForm").reset();$("#taskPoints").value=10;closeModals();renderApp();toast("Task added to the whole group.");}
function deleteTask(id){const g=activeGroup();if(!g)return;const t=g.tasks.find(t=>t.id===id);if(!t)return;if(t.createdBy!=="admin"&&t.createdBy!==state.user.id&&state.user.id!==g.adminId){toast("Only the creator or group admin can remove this task.");return;}if(!confirm(`Remove "${t.name}" from this group?`))return;g.tasks=g.tasks.filter(t=>t.id!==id);Object.values(g.records).forEach(day=>Object.values(day).forEach(r=>r.done=r.done.filter(x=>x!==id)));saveState();renderApp();toast("Task removed.");}
function getStreak(g,memberId){let streak=0,d=new Date();for(let i=0;i<365;i++){const key=todayKey(d);const r=g.records[key]?.[memberId];if(r&&r.done.length){streak++;d.setDate(d.getDate()-1);}else if(i===0){d.setDate(d.getDate()-1);}else break;}return streak;}
function renderApp(){
 const g=activeGroup();if(!state.user||!g){setPage("landing");return;}
 $("#headerGroupName").textContent=g.name;$("#headerUsername").textContent=state.user.name;$("#userAvatar").textContent=userInitial(state.user.name);$("#welcomeHeading").textContent=`Good to see you, ${state.user.name.split(" ")[0]} 👋`;$("#currentDate").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
 const mine=currentMember();$("#yourToday").textContent=memberPoints(g,mine.id);$("#yourTodaySub").textContent=`${ensureRecord(g,mine.id).done.length} activities completed`;$("#groupPoints").textContent=groupPointsToday(g);$("#yourStreak").innerHTML=`${getStreak(g,mine.id)} <em>days</em>`;const doneCount=g.members.reduce((n,m)=>n+ensureRecord(g,m.id).done.length,0);$("#completedCount").textContent=`${doneCount}/${g.tasks.length*g.members.length}`;
 renderTaskLists();renderActivity();renderLeaderboards();renderCharts();renderCalendar();renderGroupMenu();
}
function taskRow(g,t,mine,compact=false){const done=isDone(g,mine.id,t.id);return `<div class="task-row ${done?"is-done":""}"><button class="task-check ${done?"checked":""}" data-toggle="${t.id}" aria-label="${done?"Mark incomplete":"Mark complete"}">${done?"✓":""}</button><div class="task-details"><strong>${escapeHTML(t.name)}</strong><small>${escapeHTML(t.category)} · ${t.points} points</small></div><span class="task-points">+${t.points}</span></div>`;}
function renderTaskLists(){
 const g=activeGroup(),mine=currentMember();const todays=g.tasks.slice(0,5);$("#todayTasks").innerHTML=todays.length?todays.map(t=>taskRow(g,t,mine,true)).join(""):'<div class="empty-state">No tasks yet. Add your first one.</div>';
 const tasks=g.tasks.filter(t=>taskFilter==="all"||(taskFilter==="active"&&!isDone(g,mine.id,t.id))||(taskFilter==="done"&&isDone(g,mine.id,t.id)));
 $("#allTasks").innerHTML=tasks.length?tasks.map(t=>`<article class="task-card"><button class="task-check ${isDone(g,mine.id,t.id)?"checked":""}" data-toggle="${t.id}">${isDone(g,mine.id,t.id)?"✓":""}</button><div class="task-card-main"><h3>${escapeHTML(t.name)}</h3><p>${escapeHTML(t.category)} · ${t.points} points per completion</p><div class="task-card-foot"><span class="task-tag">${escapeHTML(t.category)}</span><span>${isDone(g,mine.id,t.id)?"Completed today":"Not completed yet"}</span></div></div><button class="delete-task" data-delete="${t.id}" title="Remove task">×</button></article>`).join(""):'<div class="empty-box"><strong>Nothing here just yet.</strong>Add a task or choose another filter.</div>';
 $$("[data-toggle]").forEach(b=>b.onclick=()=>toggleTask(b.dataset.toggle));$$("[data-delete]").forEach(b=>b.onclick=()=>deleteTask(b.dataset.delete));
}
function renderActivity(){const g=activeGroup(),list=$("#activityList");const items=g.activity.slice(0,5);list.innerHTML=items.length?items.map(a=>`<div class="activity-item"><div class="activity-avatar ${a.memberId===state.user.id?"":"purple"}">${userInitial(a.memberName)}</div><div class="activity-copy"><span><strong>${escapeHTML(a.memberName)}</strong> ${a.undone?"updated":"completed"} ${escapeHTML(a.taskName)}</span><small>${a.date===todayKey()?"Today":a.date} · ${a.time||""}</small></div><span class="activity-points">${a.undone?"updated":`+${a.points} pts`}</span></div>`).join(""):'<div class="empty-state">Activity will appear here as your group gets started.</div>';}
function renderLeaderboards(){
 const g=activeGroup(),ranked=[...g.members].sort((a,b)=>totalPoints(g,b.id)-totalPoints(g,a.id));const html=ranked.map((m,i)=>`<div class="leader-row"><span class="leader-rank">${i+1}</span><span class="activity-avatar ${i%2?"purple":""}">${userInitial(m.name)}</span><span class="leader-name">${escapeHTML(m.name)} ${m.id===state.user.id?"(you)":""}</span><span class="leader-points">${totalPoints(g,m.id)} pts</span></div>`).join("");
 $("#miniLeaderboard").innerHTML=html||'<div class="empty-state">No members yet.</div>';$("#fullLeaderboard").innerHTML=ranked.map((m,i)=>{const max=Math.max(1,...ranked.map(x=>totalPoints(g,x.id)));return `<div class="leader-row"><span class="leader-rank">${i+1}</span><span class="activity-avatar ${i%2?"purple":""}">${userInitial(m.name)}</span><span class="leader-name">${escapeHTML(m.name)} ${m.role==="admin"?"· Admin":""} ${m.id===state.user.id?"(you)":""}</span><div class="leader-bar"><i style="width:${totalPoints(g,m.id)/max*100}%"></i></div><span class="leader-points">${totalPoints(g,m.id)} pts</span></div>`;}).join("");
 $("#allTimePoints").textContent=ranked.reduce((s,m)=>s+totalPoints(g,m.id),0);$("#allTimeTasks").textContent=Object.values(g.records).reduce((s,d)=>s+Object.values(d).reduce((n,r)=>n+r.done.length,0),0);$("#memberCount").textContent=g.members.length;
}
function datesFor(days=7){const dates=[];for(let i=days-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);dates.push(todayKey(d));}return dates;}
function renderCharts(){
 const g=activeGroup();if(!g)return;const dates=datesFor(7);const series=g.members.slice(0,8).map((m,i)=>({member:m,color:palette[i%palette.length],daily:dates.map(d=>memberPoints(g,m.id,d))}));const mode=$("#chartMode").value;
 drawChart($("#progressChart"),dates.map(d=>d.slice(5)),series.map(s=>({...s,values:mode==="daily"?s.daily:s.daily.map((_,i)=>Object.keys(g.records).filter(k=>k<=dates[i]).reduce((sum,k)=>sum+memberPoints(g,s.member.id,k),0))})));
 $("#chartKey").innerHTML=series.map(s=>`<span><i style="background:${s.color}"></i>${escapeHTML(s.member.name)}</span>`).join("");
 const allDates=datesFor(14);const allSeries=g.members.slice(0,8).map((m,i)=>({member:m,color:palette[i%palette.length],daily:allDates.map(d=>memberPoints(g,m.id,d))}));
 drawChart($("#dailyChart"),allDates.map(d=>d.slice(5)),allSeries.map(s=>({...s,values:s.daily})));drawChart($("#cumulativeChart"),allDates.map(d=>d.slice(5)),allSeries.map(s=>({...s,values:s.daily.map((_,i)=>Object.keys(g.records).filter(k=>k<=allDates[i]).reduce((sum,k)=>sum+memberPoints(g,s.member.id,k),0))})));
 ["dailyKey","cumulativeKey"].forEach(id=>$("#"+id).innerHTML=allSeries.map(s=>`<span><i style="background:${s.color}"></i>${escapeHTML(s.member.name)}</span>`).join(""));
}
function drawChart(canvas,labels,series){
 if(!canvas)return;const rect=canvas.getBoundingClientRect();const w=Math.max(280,rect.width||500),h=Math.max(160,rect.height||210),dpr=window.devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext("2d");ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
 const pad={l:32,r:12,t:14,b:28},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;const max=Math.max(10,...series.flatMap(s=>s.values))*1.15;
 ctx.font="10px DM Sans";ctx.textBaseline="middle";for(let i=0;i<=4;i++){const y=pad.t+ch*i/4;ctx.strokeStyle="#27344a";ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#71819c";ctx.textAlign="right";ctx.fillText(Math.round(max*(1-i/4)),pad.l-8,y);}
 labels.forEach((label,i)=>{const x=pad.l+(labels.length===1?cw/2:cw*i/(labels.length-1));ctx.fillStyle="#7f90aa";ctx.textAlign=i===0?"left":i===labels.length-1?"right":"center";ctx.fillText(label,x,h-10);});
 series.forEach(s=>{const pts=s.values.map((v,i)=>({x:pad.l+(labels.length===1?cw/2:cw*i/(labels.length-1)),y:pad.t+ch-(v/max)*ch}));if(!pts.length)return;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=s.color;ctx.lineWidth=2.4;ctx.lineJoin="round";ctx.lineCap="round";ctx.stroke();pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fillStyle=s.color;ctx.fill();});});
}
function renderCalendar(){
 const g=activeGroup();if(!g)return;const year=calendarDate.getFullYear(),month=calendarDate.getMonth();$("#calendarMonth").textContent=calendarDate.toLocaleDateString(undefined,{month:"long",year:"numeric"});const first=new Date(year,month,1).getDay(),count=new Date(year,month+1,0).getDate(),prevCount=new Date(year,month,0).getDate();let html="";
 for(let i=0;i<42;i++){let day,other=false,date;if(i<first){day=prevCount-first+i+1;other=true;date=new Date(year,month-1,day);}else if(i>=first+count){day=i-first-count+1;other=true;date=new Date(year,month+1,day);}else{day=i-first+1;date=new Date(year,month,day);}const key=todayKey(date),has=Object.values(g.records[key]||{}).some(r=>r.done.length),pts=g.members.reduce((s,m)=>s+memberPoints(g,m.id,key),0);html+=`<div class="calendar-day ${other?"muted":""} ${has?"has-activity":""} ${key===todayKey()?"today":""}"><span>${day}</span>${has?`<small>${pts} pts</small>`:""}</div>`;}
 $("#calendarGrid").innerHTML=html;
}
function renderGroupMenu(){const g=activeGroup();$("#groupSwitcher").innerHTML=`${escapeHTML(g.name)} <span>⌄</span>`;$("#groupMenu").innerHTML=state.groups.filter(x=>x.members.some(m=>m.id===state.user.id)).map(x=>`<button data-group="${x.id}">${escapeHTML(x.name)} ${x.id===g.id?"✓":""}</button>`).join("")+`<button data-newgroup="1">＋ Create another group</button><button data-joingroup="1">↗ Join with invite code</button>`;$$("[data-group]").forEach(b=>b.onclick=()=>{state.activeGroupId=b.dataset.group;saveState();$("#groupMenu").classList.add("hidden");renderApp();});$("[data-newgroup]").onclick=()=>{authStep="create";authMode="signup";renderAuth();showModal("authModal");$("#groupMenu").classList.add("hidden");};$("[data-joingroup]").onclick=()=>{authStep="join";renderAuth();showModal("authModal");$("#groupMenu").classList.add("hidden");};}
function setView(view){currentView=view;$$(".side-link[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));$$(".view").forEach(v=>v.classList.remove("active"));$("#"+view+"View").classList.add("active");$("#pageTitle").textContent=({dashboard:"Overview",tasks:"Tasks",progress:"Progress",calendar:"Calendar",leaderboard:"Leaderboard"})[view]||"Overview";if(view==="progress")renderCharts();if(view==="calendar")renderCalendar();$(".sidebar").classList.remove("mobile-open");}
function openTaskModal(){if(!activeGroup()){showAuth("signup");return;}showModal("taskModal");setTimeout(()=>$("#taskName").focus(),50);}
function logout(){state.user=null;state.activeGroupId=null;saveState();closeModals();setPage("landing");toast("You have logged out of this demo.");}

document.addEventListener("click",e=>{
 const open=e.target.closest("[data-open]");if(open)showAuth(open.dataset.open);
 if(e.target.closest("[data-close]"))closeModals();
 const view=e.target.closest("[data-view]");if(view&&activeGroup()){setView(view.dataset.view);return;}
 if(e.target.id==="exploreButton")$("#features").scrollIntoView({behavior:"smooth"});
});
$("#menuButton").onclick=()=>{$("#mainNav").classList.toggle("mobile-open");};
$("#taskForm").onsubmit=addTask;
["addTaskTop","addTaskInline","addTaskPage"].forEach(id=>$("#"+id).onclick=openTaskModal);
$$("[data-filter]").forEach(b=>b.onclick=()=>{taskFilter=b.dataset.filter;$$("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));renderTaskLists();});
$("#chartMode").onchange=renderCharts;
$("#groupSwitcher").onclick=()=>$("#groupMenu").classList.toggle("hidden");
$("#groupSettingsButton").onclick=()=>{const g=activeGroup();if(!g)return;$("#groupNameInput").value=g.name;$("#settingsInviteCode").textContent=g.inviteCode;showModal("settingsModal");};
$("#settingsForm").onsubmit=e=>{e.preventDefault();const g=activeGroup();g.name=$("#groupNameInput").value.trim()||g.name;saveState();closeModals();renderApp();toast("Group settings saved.");};
$("#copyCode").onclick=async()=>{try{await navigator.clipboard.writeText($("#settingsInviteCode").textContent);toast("Invite code copied.");}catch{toast("Your invite code is "+$("#settingsInviteCode").textContent);}};
$("#logoutButton").onclick=logout;$("#headerLogout").onclick=logout;$("#userMenuButton").onclick=()=>$("#userMenu").classList.toggle("hidden");$("#profileButton").onclick=()=>toast(`${state.user.name} · ${state.user.email}`);
$("#mobileMenu").onclick=()=>$(".sidebar").classList.toggle("mobile-open");
$("#prevMonth").onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()-1);renderCalendar();};$("#nextMonth").onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()+1);renderCalendar();};
window.addEventListener("resize",()=>{if(activeGroup())renderCharts();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModals();$("#groupMenu").classList.add("hidden");$("#userMenu").classList.add("hidden");}});
if(state.user&&state.activeGroupId&&activeGroup()){setPage("dashboard");}else{setPage("landing");}
