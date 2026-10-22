import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronDown, Clock3, Copy, Info, Link2, LoaderCircle, LockKeyhole, Plus, RefreshCw, Sparkles, Users, X } from 'lucide-react';
import Calendar from './components/Calendar';
import { useUnsavedNavigation } from './components/UnsavedNavigation';
import TimezonePicker from './components/TimezonePicker';
import AvailabilityGrid from './components/AvailabilityGrid';
import { api, loadSecret, saveSecret } from './lib/api';
import { allSlots, bestTimes, deviceTimezone, formatDay, formatTime, localDate, slotsToRanges, zoneLabel } from './lib/time';
import { t, getLocale } from './lib/i18n';
import LanguageSelector, { useLanguage } from './components/LanguageSelector';
import { BRAND } from './brand';
import type { Candidate, MeetingEvent } from './lib/types';

export default function App(){
  const language=useLanguage();
  useEffect(()=>{document.documentElement.lang=language==='zh'?'zh-CN':language;document.title=`Whenkin — ${t("Find Your Shared Time.")}`;},[language]);
  const path=window.location.pathname,match=path.match(/^\/e\/([0-9a-f-]{36})\/?$/i);
  return <><Header inEvent={!!match}/>{match?<EventPage id={match[1]}/>:path==='/'?<CreatePage/>:<main className="error-page"><h1>{t("That Page Is a Little Off-Grid.")}</h1><a className="button primary" href="/">{t("Create an event")} <ArrowRight size={17}/></a></main>}<Footer/></>;
}
function Header({inEvent}:{inEvent:boolean}){return <header className="site-header"><a className="brand" href="/" aria-label={t('Whenkin home')}><img src="/favicon.svg" alt=""/><span>{BRAND.name.toLowerCase()}</span></a><nav aria-label={t('Main navigation')}><LanguageSelector/>{inEvent&&<a className="button secondary compact" href="/"><Plus size={16}/> {t('New event')}</a>}</nav></header>;}
function Footer(){return <footer className="site-footer"><span>{t(BRAND.tagline)}</span><span>{t("Made for people, wherever they are.")}<GlobeIcon/></span></footer>;}
function GlobeIcon(){return <span className="footer-dot" aria-hidden="true"/>;}
const steps=[
  {title:"The Organizer Creates an Event",short:'Choose possible dates and hours, then share the link.',icon:CalendarDays},
  {title:"Participants Mark When They’re Free",short:'Open the link and drag across the time grid. No account needed.',icon:Users},
  {title:"Whenkin Suggests the Best Times",short:'We compare availability. The organizer shares the chosen time.',icon:Check},
];
const times=Array.from({length:97},(_,i)=>`${String(Math.floor(i/4)).padStart(2,'0')}:${String(i%4*15).padStart(2,'0')}`);
function labelTime(value:string){if(value==='24:00')return t('Midnight (next day)');return new Intl.DateTimeFormat(getLocale(),{timeZone:'UTC',hour:'numeric',minute:'2-digit'}).format(new Date(`2000-01-01T${value}:00Z`));}

function CreatePage(){
  const [zone,setZone]=useState(deviceTimezone),[dates,setDates]=useState<string[]>([]),[title,setTitle]=useState(''),[organizer,setOrganizer]=useState(''),[description,setDescription]=useState(''),[notes,setNotes]=useState(false),[start,setStart]=useState('09:00'),[end,setEnd]=useState('18:00'),[duration,setDuration]=useState(60),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const createSnapshot=JSON.stringify({zone,dates,title,organizer,description,start,end,duration}),initialSnapshot=useRef(createSnapshot);
  const navigation=useUnsavedNavigation(createSnapshot!==initialSnapshot.current,"Your Event Has Not Been Saved.");
  const [connection,setConnection]=useState<'checking'|'ready'|'setup'|'unreachable'>('checking');
  const checkConnection=useCallback(async()=>{setConnection('checking');try{const result=await api<{ready:boolean}>('/health');setConnection(result.ready===true?'ready':'setup');}catch{setConnection('unreachable');}},[]);
  useEffect(()=>{void checkConnection();},[checkConnection]);
  async function create(e:React.FormEvent){e.preventDefault();setError('');if(connection!=='ready')return;if(!dates.length){setError('Choose at least one date on the calendar.');return;}if(start>=end){setError('Choose an end time after the start time.');return;}setBusy(true);
    try {const result=await api<{id:string;adminToken:string}>('/events',{method:'POST',body:JSON.stringify({title,organizer_name:organizer,description,timezone:zone,dates,startTime:start,endTime:end,duration})});saveSecret(`meetgrid:owner:${result.id}`,result.adminToken);navigation.allowNavigation();window.location.assign(`/e/${result.id}#organizer=${result.adminToken}`);}
    catch(e){setError(e instanceof Error?e.message:'Could not create your event. Please try again.');setBusy(false);}
  }
  return <main className="create-page">{navigation.dialog}<section className="intro"><div className="eyebrow"><span/> {t("LESS BACK-AND-FORTH. MORE TOGETHER.")}</div><h1>{t("Find a Time.")}<br/><span>{t("Make It Happen.")}</span></h1><div className="intro-promises"><span><Check size={16}/> {t("No sign-up needed")}</span><span><Check size={16}/> {t("Every time zone welcome")}</span></div>
    <div className="overlap-art" aria-hidden="true"><div className="overlap-square one"/><div className="overlap-square two"/><div className="overlap-square intersection"/><span className="art-label first">{t("your time")}</span><span className="art-label second">{t("their time")}</span><span className="art-label shared">{t("a little common ground")} <ArrowRight size={16}/></span></div>
    <div className="how-it-works"><p className="eyebrow">{t("THREE SMALL STEPS")}</p><ol>{steps.map((step,i)=><li key={step.title}><span>0{i+1}</span><div><strong>{t(step.title)}</strong><p>{t(step.short)}</p></div></li>)}</ol></div>
  </section><section className="create-card"><div className="form-heading"><div><p className="eyebrow">{t("LET’S GET SOMETHING ON THE CALENDAR")}</p><h2>{t("Create Your Event")}</h2></div><div className="heading-icon"><CalendarDays size={22}/></div></div><form onSubmit={create}>
    <label className="field">{t("What are you planning?")}<input autoComplete="off" required maxLength={100} placeholder={t("e.g. Friday dinner, team catch-up…")} value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label className="field">{t("Your name")}<input autoComplete="given-name" required maxLength={60} placeholder={t("So everyone knows who’s organizing")} value={organizer} onChange={e=>setOrganizer(e.target.value)}/></label>
    {notes?<label className="field">{t("A little more detail")} <span className="optional">{t("optional")}</span><textarea maxLength={1000} rows={2} placeholder={t("Where, what, or anything people should know")} value={description} onChange={e=>setDescription(e.target.value)}/></label>:<button className="text-button add-note" type="button" onClick={()=>setNotes(true)}><Plus size={14}/> {t("Add a note")}</button>}
    <div className="form-divider"/><label className="field-label">{t("Which dates could work?")} <span className="optional">{t("Pick one or more")}</span></label><Calendar value={dates} onChange={setDates} timezone={zone}/>
    <div className="fields-row"><label className="field">{t("From")}<select value={start} onChange={e=>setStart(e.target.value)}>{times.slice(0,-1).map(t=><option key={t} value={t}>{labelTime(t)}</option>)}</select></label><label className="field">{t("Until")}<select value={end} onChange={e=>setEnd(e.target.value)}>{times.slice(1).map(t=><option key={t} value={t}>{labelTime(t)}</option>)}</select></label><label className="field">{t("Meeting length")}<select value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[15,30,45,60,90,120,180,240].map(n=><option key={n} value={n}>{n<60?t('{count} min',{count:n}):t(n===60?'{count} hour':'{count} hours',{count:n/60})}</option>)}</select></label></div>
    <TimezonePicker value={zone} onChange={setZone}/><p className="field-help">{t("Dates and hours above use this time zone. Your guests will see their own local times.")}</p>
    {(connection==='setup'||connection==='unreachable')&&<div className="connection-notice" role="status"><Info size={17}/><div><strong>{t(connection==='setup'?'Event creation is still being set up.':'We can’t reach event saving right now.')}</strong><p>{t(connection==='setup'?'Shareable links will be available when setup is complete.':'Your form is still here. Please retry the connection.')}</p><div><button type="button" className="text-button" onClick={()=>void checkConnection()}><RefreshCw size={12}/> {t("Retry connection")}</button></div></div></div>}
    {error&&<p className="error-message" role="alert">{t(error)}</p>}<button disabled={busy||connection!=='ready'} className="button primary create-submit" type="submit">{busy?<><LoaderCircle className="spin" size={18}/> {t("Creating your event…")}</>:connection==='checking'?<><LoaderCircle className="spin" size={18}/> {t("Checking connection…")}</>:<>{t("Create event & get a link")} <ArrowRight size={18}/></>}</button><p className="privacy-note"><LockKeyhole size={12}/> {t("Participants see only their own availability unless you enable group sharing.")}</p>
  </form></section></main>;
}

type Identity={id:string;token:string};
function EventPage({id}:{id:string}){
  const [event,setEvent]=useState<MeetingEvent|null>(null),[zone,setZone]=useState(deviceTimezone),[identity,setIdentity]=useState<Identity|null>(null),[admin,setAdmin]=useState(''),[name,setName]=useState(''),[selected,setSelected]=useState<Set<number>>(new Set()),[view,setView]=useState<'mine'|'group'>('mine');
  const [isSaving,setIsSaving]=useState(false),[nameError,setNameError]=useState(false),[settingsBusy,setSettingsBusy]=useState(false);
  const nameInput=useRef<HTMLInputElement>(null),adminRef=useRef('');
  const [error,setError]=useState(''),[saveState,setSaveState]=useState<'saved'|'dirty'|'saving'|'error'>('saved'),[share,setShare]=useState(false),[copied,setCopied]=useState(''),[active,setActive]=useState<Candidate|null>(null),[limit,setLimit]=useState(5),[showRestore,setShowRestore]=useState(false);
  const eventRef=useRef<MeetingEvent|null>(null),dirty=useRef(false),saving=useRef(false),generation=useRef(0),identityRef=useRef<Identity|null>(null),revisionRef=useRef(0),latest=useRef({name,zone,selected});latest.current={name,zone,selected};eventRef.current=event;
  const load=useCallback(async()=>{
    const person=identityRef.current,owner=adminRef.current;
    return api<MeetingEvent>(`/events/${id}${!owner&&person?'?response_id='+person.id:''}`,{headers:owner||person?{Authorization:`Bearer ${owner||person!.token}`}:{}});
  },[id]);
  useEffect(()=>{let alive=true;
    (async()=>{try{
      const hash=new URLSearchParams(location.hash.slice(1));let owner=hash.get('organizer')||loadSecret(`meetgrid:owner:${id}`)||'',person:Identity|null=null;
      const edit=hash.get('edit');if(edit){const [personId,token]=edit.split('.');if(personId&&token)person={id:personId,token};}
      else {try{person=JSON.parse(loadSecret(`meetgrid:response:${id}`)||'null');}catch{}}
      if(owner)saveSecret(`meetgrid:owner:${id}`,owner);if(person)saveSecret(`meetgrid:response:${id}`,JSON.stringify(person));
      if(hash.has('organizer')||hash.has('edit'))history.replaceState(null,'',location.pathname);
      adminRef.current=owner;identityRef.current=person;
      const result=await load();if(!alive)return;
      const mine=result.responses.find(r=>r.id===person?.id);
      if(mine){setName(mine.name);setSelected(new Set(allSlots(mine.ranges)));revisionRef.current=mine.revision;}
      else if(person)person=null;
      setIdentity(person);identityRef.current=person;setAdmin(owner);setEvent(result);
      const draft=loadSecret(`meetgrid:draft:${id}`);if(draft)setShowRestore(true);
    }catch(e){if(alive)setError(e instanceof Error?e.message:'Could not load this event.');}})();return()=>{alive=false;};
  },[id,load]);
  useEffect(()=>{if(!event)return;const timer=setInterval(()=>{if(document.visibilityState==='visible')load().then(setEvent).catch(()=>{});},30000);return()=>clearInterval(timer);},[!!event,load]);
  const navigation=useUnsavedNavigation(saveState!=='saved'||settingsBusy);
  useEffect(()=>{if(event&&!event.can_view_group){setView('mine');setActive(null);}},[event?.can_view_group]);
  function mark(next:Set<number>){setSelected(next);changeDraft({selected:next});}
  function changeDraft(change:Partial<typeof latest.current>={}){dirty.current=true;generation.current++;setSaveState('dirty');const value={...latest.current,...change};saveSecret(`meetgrid:draft:${id}`,JSON.stringify({name:value.name,zone:value.zone,slots:[...value.selected]}));}
  function changeZone(next:string){if(next===zone)return;setZone(next);changeDraft({zone:next});}
  const save=useCallback(async()=>{
    if(saving.current||!eventRef.current)return;const value=latest.current;if(!value.name.trim()){setNameError(true);nameInput.current?.focus();nameInput.current?.scrollIntoView({block:'center',behavior:'smooth'});return;}
    setNameError(false);
    saving.current=true;setIsSaving(true);const version=generation.current;setSaveState('saving');setError('');
    try{
      const person=identityRef.current,payload={name:value.name,timezone:value.zone,ranges:slotsToRanges(value.selected),revision:revisionRef.current};
        const result=await api<{id:string;editToken?:string;revision:number}>(`/events/${id}/responses${person?'/'+person.id:''}`,{method:person?'PUT':'POST',headers:person?{Authorization:`Bearer ${person.token}`}:{},body:JSON.stringify(payload)});
        if(!person){const next={id:result.id,token:result.editToken!};identityRef.current=next;setIdentity(next);saveSecret(`meetgrid:response:${id}`,JSON.stringify(next));}
        revisionRef.current=result.revision;setEvent(await load());
      if(version===generation.current){dirty.current=false;setSaveState('saved');try{localStorage.removeItem(`meetgrid:draft:${id}`);}catch{}}else setSaveState('dirty');
    }catch(e){setError(e instanceof Error?e.message:'Could not save. Your draft stays on this device.');setSaveState('error');}
    finally{saving.current=false;setIsSaving(false);}
  },[id,load]);
  useEffect(()=>{if(saveState!=='dirty'||!name.trim()||isSaving)return;const timer=setTimeout(()=>{void save();},1000);return()=>clearTimeout(timer);},[saveState,name,selected,zone,save,isSaving]);
  const counts=useMemo(()=>{const result=new Map<number,number>();event?.responses.forEach(r=>{allSlots(r.ranges).forEach(t=>result.set(t,(result.get(t)||0)+1));});return result;},[event]);
  const candidates=useMemo(()=>event?bestTimes(event):[],[event]);
  const suggestions=useMemo(()=>{const result:Candidate[]=[];for(const candidate of candidates){if(!candidate.available.length)continue;if(!result.some(r=>r.available.length===candidate.available.length&&Math.abs(Date.parse(r.start)-Date.parse(candidate.start))<event!.duration*60000))result.push(candidate);if(result.length>=20)break;}return result;},[candidates,event]);
  async function changeSharing(enabled:boolean){if(!event||settingsBusy)return;setSettingsBusy(true);setError('');try{await api(`/events/${id}/settings`,{method:'PATCH',headers:{Authorization:`Bearer ${admin}`},body:JSON.stringify({show_group_availability:enabled})});setEvent(await load());}catch(e){setError(e instanceof Error?e.message:'Could not save. Your draft stays on this device.');}finally{setSettingsBusy(false);}}
  async function copy(value:string,label:string){try{await navigator.clipboard.writeText(value);setCopied(label);setTimeout(()=>setCopied(''),2200);}catch{setError('Copy did not work. Select the link in the sharing panel and copy it manually.');}}
  function restore(){try{const draft=JSON.parse(loadSecret(`meetgrid:draft:${id}`)||'null');if(draft&&event){const allowed=new Set(allSlots(event.windows)),restored={name:draft.name||'',zone:draft.zone||zone,selected:new Set<number>((draft.slots||[]).filter((s:number)=>allowed.has(s)))};setName(restored.name);setZone(restored.zone);setSelected(restored.selected);changeDraft(restored);}}catch{}setShowRestore(false);}
  if(!event)return <main className="loading-page">{error?<><h1>{t("We Couldn’t Open That Event.")}</h1><p role="alert">{t(error)}</p><a href="/" className="button secondary">{t("Back to home")}</a></>:<><LoaderCircle className="spin"/><p>{t("Finding your shared time…")}</p></>}</main>;
  const organizer=event.is_organizer===true,canViewGroup=event.can_view_group===true,responseCount=event.response_count??event.responses.length,eventLink=location.origin+`/e/${id}`,hours=selected.size/4;
  return <main className="event-page">{navigation.dialog}
    <div className={`event-layout ${canViewGroup?'':'private-view'}`}><section className="schedule-card">
      <header className="event-summary"><div className="event-heading"><div><p className="eyebrow">{organizer?t('YOUR EVENT'):t('ORGANIZED BY {name}',{name:event.organizer_name})}</p><h1>{event.title}</h1></div><button className="button primary compact" onClick={()=>setShare(true)}><Link2 size={17}/> {t('Share Event')}</button></div><p className="event-meta"><span><Clock3 size={16}/>{t('{count} minutes',{count:event.duration})}</span><span><Users size={16}/>{t(responseCount===1?'{count} response':'{count} responses',{count:responseCount})}</span></p>{event.description&&<p className="event-description">{event.description}</p>}</header>
      {error&&<div className="error-message" role="alert">{t(error)}</div>}
      {organizer&&<div className="sharing-setting"><label><span>{t('Let participants see group availability')}</span><input type="checkbox" role="switch" checked={event.show_group_availability===true} disabled={settingsBusy} onChange={e=>void changeSharing(e.target.checked)}/></label><p>{t(event.show_group_availability?'Participants can see everyone’s availability and common ground.':'Participants can see only their own availability and the response count.')}</p></div>}
      <div className="schedule-toolbar"><div className="schedule-tabs"><div className="segmented"><button aria-pressed={view==='mine'} onClick={()=>setView('mine')}>{t("Your Availability")}</button>{canViewGroup&&<button aria-pressed={view==='group'} onClick={()=>setView('group')}>{t("Group Availability")}</button>}</div><span className={`save-status ${saveState}`} role="status">{saveState==='saving'?<LoaderCircle className="spin" size={14}/>:saveState==='saved'?<Check size={14}/>:<span className="status-dot"/>}{t(saveState==='saved'?(identity?'Saved':'Not submitted yet'):saveState==='saving'?'Saving…':saveState==='dirty'?'Unsaved changes':'Not saved')}</span></div><TimezonePicker value={zone} onChange={changeZone} at={Date.parse(event.windows[0].start)}/></div>
      {showRestore&&<div className="draft-banner"><span>{t("You have an unsaved draft on this device.")}</span><button className="text-button" onClick={restore}>{t("Restore draft")}</button><button className="icon-button" aria-label={t("Dismiss draft")} onClick={()=>setShowRestore(false)}><X size={15}/></button></div>}
      {view==='mine'&&<div className="participant-line"><div className="participant-name"><label htmlFor="participant-name">{t('Your name')}</label><input id="participant-name" ref={nameInput} maxLength={60} placeholder={t('Enter your name')} value={name} aria-invalid={nameError} aria-describedby={nameError?'name-error':!name.trim()?'name-help':undefined} onChange={e=>{setName(e.target.value);setNameError(false);changeDraft({name:e.target.value});}}/>{nameError?<p id="name-error" className="name-error" role="alert">{t('Please enter your name.')}</p>:!name.trim()&&<p id="name-help" className="field-help">{t('Enter your name to save your availability.')}</p>}</div><p><strong>{t('{count} hours selected',{count:hours.toLocaleString(getLocale(),{maximumFractionDigits:2})})}</strong></p></div>}
      <AvailabilityGrid event={event} zone={zone} selected={selected} onChange={mark} counts={counts} view={view} highlight={active}/>
      {view==='mine'&&<div className="save-bar"><span><LockKeyhole size={14}/>{t(identity?'Your edit link keeps your response yours.':'No account needed. Your response is editable on this device.')}</span><button className="button primary compact" disabled={saveState==='saving'} onClick={()=>void save()}>{t(saveState==='saving'?'Saving…':'Save availability')}<Check size={16}/></button></div>}

      {identity&&<div className="edit-link-line"><button className="text-button" onClick={()=>void copy(eventLink+`#edit=${identity.id}.${identity.token}`,'edit')}>{copied==='edit'?<Check size={14}/>:<Copy size={14}/>} {t(copied==='edit'?'Copied private edit link':'Copy my private edit link')}</button><span>{t("Save this link to edit from another device.")}</span></div>}
    </section>{canViewGroup&&<aside className="results-sidebar"><section className="suggestions-card"><div className="sidebar-title"><span className="sparkle-icon"><Sparkles size={18}/></span><h2>{t("Your Common Ground")}</h2></div><p className="sidebar-description">{t('Best {count}-minute times, based on everyone who has responded.',{count:event.duration})}</p><div className="suggestion-zone"><Clock3 size={13}/> {t('Times shown in {zone}',{zone:zoneLabel(zone)})}{organizer&&zone!==event.timezone&&<button className="text-button" onClick={()=>changeZone(event.timezone)}>{t("Use organizer’s zone")}</button>}</div>
      {!suggestions.length?<div className="empty-results"><Users size={28}/><strong>{t(event.responses.length?'No shared times yet':'The possibilities start with you.')}</strong><p>{t(event.responses.length?'Add more availability to find a time that works.':'Mark your availability, then share the event with your group.')}</p></div>:<div className="suggestions">{suggestions.slice(0,limit).map((candidate,i)=><button className={`suggestion ${active?.start===candidate.start?'active':''}`} key={candidate.start} onClick={()=>{setActive(active?.start===candidate.start?null:candidate);setView('group');}}><div className="suggestion-top"><strong>{formatDay(candidate.start,zone)}</strong>{i===0&&<span className="best-badge">{t("Best fit")}</span>}</div><span className="suggestion-time">{formatTime(candidate.start,zone)} – {localDate(candidate.start,zone)!==localDate(candidate.end,zone)?formatDay(candidate.end,zone)+' ':''}{formatTime(candidate.end,zone)}</span><span className="attendance"><span className="attendance-dots">{Array.from({length:Math.min(event.responses.length,8)},(_,j)=><i key={j} className={j<candidate.available.length?'filled':''}/>)}</span>{candidate.available.length===event.responses.length?t('Everyone available'):t('{count} of {total} available',{count:candidate.available.length,total:event.responses.length})}</span></button>)}</div>}
      {suggestions.length>limit&&<button className="text-button more-times" onClick={()=>setLimit(limit+5)}>{t("Show more times")} <ChevronDown size={15}/></button>}
      {active&&<div className="candidate-detail"><strong>{t("Who Can Make It?")}</strong>{event.responses.map(r=><p key={r.id}><span className={`presence ${active.available.includes(r.id)?'yes':''}`}>{active.available.includes(r.id)?<Check size={12}/>:<X size={12}/>}</span>{r.name}<small>{t(active.available.includes(r.id)?'Available':'Unavailable')}</small></p>)}</div>}
    </section><section className="people-card"><div className="sidebar-title"><Users size={17}/><h3>{t("The Group")} <span>{event.responses.length}</span></h3><button className="icon-button" aria-label={t("Refresh responses")} onClick={()=>{load().then(setEvent).catch(e=>setError(e.message));}}><RefreshCw size={14}/></button></div>{event.responses.length?event.responses.map((r,i)=><div className="person" key={r.id}><span className={`avatar avatar-${i%3}`}>{r.name.slice(0,1).toUpperCase()}</span><span><strong>{r.name}{r.id===identity?.id&&<small> {t("(you)")}</small>}</strong><small>{zoneLabel(r.timezone)}</small></span><Check size={14}/></div>):<p className="field-help">{t("Responses will appear here. Anyone who hasn’t responded is not counted as unavailable.")}</p>}<p className="group-foot"><Check size={13}/> {t("Responded · people without a response aren’t counted")}</p></section></aside>}</div>
    {share&&<div className="modal-backdrop" onClick={()=>setShare(false)}><section className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')setShare(false);}}><button className="icon-button modal-close" aria-label={t("Close sharing")} onClick={()=>setShare(false)}><X size={20}/></button><div className="heading-icon"><Link2 size={23}/></div><h2 id="share-title">{t("Good Plans Are Shared.")}</h2><p>{t("Send this link to your group. Everyone can add their availability without an account.")}</p><label className="field">{t("Participant link")}<input readOnly value={eventLink} onFocus={e=>e.target.select()}/></label><button className="button primary" onClick={()=>void copy(eventLink,'event')}>{copied==='event'?<><Check size={17}/> {t("Link copied")}</>:<><Copy size={17}/> {t("Copy event link")}</>}</button>{admin&&<div className="organizer-link"><strong><LockKeyhole size={15}/> {t("Just for you")}</strong><p>{t("Keep your organizer link private. It lets you view all responses and manage group sharing.")}</p><input aria-label={t("Private organizer link")} readOnly value={eventLink+`#organizer=${admin}`} onFocus={e=>e.target.select()}/><button className="text-button" onClick={()=>void copy(eventLink+`#organizer=${admin}`,'organizer')}>{t(copied==='organizer'?'Copied':'Copy organizer link')}</button></div>}</section></div>}
  </main>;
}
