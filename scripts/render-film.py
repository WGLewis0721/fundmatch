"""Render FundMatch's original 24-second UI motion film. Requires Pillow, NumPy, FFmpeg.
No stock assets, scraped screenshots, generated brand claims, or external audio.
Run from repository root: python scripts/render-film.py
"""
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import math, subprocess, wave, os, tempfile
from pathlib import Path
W,H,FPS,DURATION=1280,720,30,24
OUT=Path('public/media'); OUT.mkdir(parents=True,exist_ok=True)
FONT='/usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf'
BOLD='/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf'
INK='#272b31'; MUTED='#929aa7'; WHITE='#f8f7f3'; MINT='#c6efde'; PERI='#a3b2f4'
fonts={}
def font(n,b=False):
    k=(n,b)
    if k not in fonts: fonts[k]=ImageFont.truetype(BOLD if b else FONT,n)
    return fonts[k]
def text(d,xy,s,n=20,c=WHITE,b=False): d.text(xy,s,font=font(n,b),fill=c)
def rr(d,box,fill,r=20,outline=None): d.rounded_rectangle(box,radius=r,fill=fill,outline=outline,width=1)
def ease(x):
    x=max(0,min(1,x)); return 1-(1-x)**3
def label(d,xy,s): text(d,xy,s,12,PERI,True)
def chip(d,x,y,s,color='#e8ece7',fg='#607065'):
    width=int(d.textlength(s,font=font(13)))+24; rr(d,(x,y,x+width,y+29),color,14);text(d,(x+12,y+7),s,13,fg)
def check(d,x,y,done=True):
    d.ellipse((x,y,x+20,y+20),fill=MINT if done else '#e8e9e4');
    if done:d.line([(x+5,y+10),(x+9,y+14),(x+15,y+6)],fill='#4d8066',width=2)
def card(name='Dippi',sub='Your neighborhood. Delivered.'):
    im=Image.new('RGBA',(470,490));d=ImageDraw.Draw(im);rr(d,(0,0,469,489),WHITE,26)
    rr(d,(28,28,88,88),'#dce5ff',16);text(d,(40,36),'d.',40,INK,True);chip(d,264,42,'COMPANY PREVIEW')
    text(d,(30,117),name,52,INK,True);text(d,(32,180),sub,18,'#777f88');chip(d,30,225,'Consumer');chip(d,140,225,'Seed');chip(d,214,225,'Marketplace')
    d.line((30,282,440,282),fill='#dddfd9');
    for x,num,lab in [(30,'$1.8M','Annual revenue'),(178,'140%','YoY growth'),(326,'$3.5M','Raising')]:
        text(d,(x,307),num,29,INK,True);text(d,(x,346),lab,13,'#899099')
    rr(d,(30,395,440,460),'#e2eee6',14);text(d,(49,409),'Your next great conversation.',19,'#52715f',True);text(d,(49,436),'Fictional data. Real product possibilities.',12,'#6b8072')
    return im

yy,xx=np.mgrid[0:H,0:W]
glow=np.exp(-((xx-890)**2+(yy-330)**2)/170000)
bg=np.zeros((H,W,3),dtype=np.uint8)
for i,b in enumerate((25,28,34)): bg[:,:,i]=np.clip(b+glow*(12,15,22)[i],0,255)
base=Image.fromarray(bg).convert('RGBA')

def scene(index,t):
    im=Image.new('RGBA',(W,H));d=ImageDraw.Draw(im)
    if index==0:
        label(d,(78,104),'INTRODUCING FUNDMATCH')
        text(d,(74,183),'Great companies.',65,WHITE,True);text(d,(74,258),'Right investors.',65,PERI,True)
        text(d,(78,370),'A better beginning',25,'#bec3cd');text(d,(78,404),'for what comes next.',25,'#bec3cd')
        text(d,(78,533),'DISCOVER  /  UNDERSTAND  /  PREPARE',11,'#a0a7b4')
        c=card();c=c.resize((402,419),Image.Resampling.LANCZOS);c=c.rotate(-3,resample=Image.Resampling.BICUBIC,expand=True)
        im.alpha_composite(c,(int(790+70*(1-ease(t/1.2))),int(145-8*math.sin(t))))
    elif index==1:
        label(d,(78,102),'01 / BRING YOUR STORY TOGETHER')
        text(d,(74,164),'One company.',62,WHITE,True);text(d,(74,235),'The whole picture.',62,PERI,True)
        text(d,(78,334),'Details. Traction. Materials.',23,'#c0c6d0')
        for j,(title,detail) in enumerate([('Company profile','Your business, clearly explained'),('Traction','The numbers behind your story'),('Materials','Your pitch, ready for review')]):
            k=ease((t-j*.4)/.7);x=int(78-30*(1-k));y=414+j*59
            rr(d,(x,y,x+500,y+47),'#32373f',12);text(d,(x+17,y+14),title,16,WHITE,True);text(d,(x+186,y+16),detail,13,'#aeb7c6')
        im.alpha_composite(card(),(755,108))
    elif index==2:
        label(d,(78,100),'02 / UNDERSTAND THE FIT')
        text(d,(74,175),'More than',62,WHITE,True);text(d,(74,245),'a first impression.',62,PERI,True)
        text(d,(78,351),'See the overlap.',24,'#c0c6d0');text(d,(78,390),'Ask better questions.',24,'#c0c6d0')
        text(d,(78,541),'TRANSPARENT RULES. HUMAN JUDGMENT.',11,'#9ca7b5')
        rr(d,(754,108,1214,599),WHITE,26);text(d,(786,143),'Dippi',32,INK,True);chip(d,1056,145,'FIT REVIEW')
        for j,(a,b) in enumerate([('Sector','Consumer marketplace'),('Stage','Seed'),('Geography','United States'),('Business model','Marketplace')]):
            y=220+j*70;check(d,786,y+5,t>j*.4);text(d,(821,y),a,14,'#7f8791');text(d,(821,y+23),b,20,INK,True)
        rr(d,(786,519,1182,566),'#e0e9ff',12);text(d,(803,535),'Next step: review unit economics.',15,'#546a9b')
    elif index==3:
        label(d,(78,102),'03 / GET READY FOR THE CONVERSATION')
        text(d,(74,180),'Big ambition.',62,WHITE,True);text(d,(74,250),'Ducks in a row.',62,MINT,True)
        text(d,(78,360),'Know what’s ready.',24,'#c0c6d0');text(d,(78,398),'Know what comes next.',24,'#c0c6d0')
        text(d,(78,543),'PREPARATION. NOT A FUNDING GUARANTEE.',11,'#9ca7b5')
        rr(d,(754,108,1214,599),WHITE,26);text(d,(786,142),'Fundraising readiness',29,INK,True)
        text(d,(786,192),'Your team. On the same page.',16,'#828a94')
        progress=.2+.4*ease(t/2.5);rr(d,(786,238,1182,245),'#e5e8e1',3);rr(d,(786,238,786+396*progress,245),'#8ec4a8',3)
        for j,a in enumerate(['Company & ownership','Founder profiles','Pitch deck','Financial forecast','Use of funds']):
            y=282+j*55;done=j<1 or (j<3 and t>j*.7);check(d,786,y,done);text(d,(819,y+2),a,18,INK);text(d,(1100,y+5),'Ready' if done else 'To do',13,'#779582' if done else '#939ca4')
    else:
        label(d,(511,127),'YOUR NEXT CHAPTER STARTS HERE')
        text(d,(282,233),'Make room for possibility.',62,WHITE,True)
        text(d,(503,362),'FundMatch.',53,MINT,True)
        rr(d,(497,461,783,515),WHITE,27);text(d,(551,480),'Explore the demo',20,INK,True)
        text(d,(459,575),'Fictional data. No investments are executed.',13,'#929dad')
    return im

cmd=['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart']
with tempfile.TemporaryDirectory() as tmp:
    silent=Path(tmp)/'silent.mp4';p=subprocess.Popen(cmd+[str(silent)],stdin=subprocess.PIPE)
    for f in range(FPS*DURATION):
        t=f/FPS;idx=min(4,int(t/4.8));local=t-idx*4.8
        frame=base.copy();layer=scene(idx,local)
        alpha=min(ease(local/.65),ease((4.8-local)/.45))
        layer.putalpha(layer.getchannel('A').point(lambda a:int(a*alpha)))
        frame.alpha_composite(layer,(0,int(17*(1-ease(local/.8)))))
        d=ImageDraw.Draw(frame);text(d,(78,651),'fundmatch.',14,'#777f8b',True);text(d,(1100,651),f'0{idx+1} / 05',12,'#777f8b')
        if f==55:frame.convert('RGB').save(OUT/'fundmatch-poster.jpg',quality=93)
        p.stdin.write(frame.convert('RGB').tobytes())
    p.stdin.close()
    if p.wait()!=0:raise RuntimeError('Video encoding failed')
    # Original understated synthesized ambient score; no licensed samples.
    sr=44100;ts=np.arange(sr*DURATION)/sr;audio=np.zeros(len(ts))
    chords=[(130.81,164.81,196),(110,130.81,164.81),(87.31,110,130.81),(98,123.47,146.83),(130.81,164.81,196)]
    for j,ch in enumerate(chords):
        local=ts-j*4.8;env=np.clip(local/1.1,0,1)*np.clip((5.2-local)/1.4,0,1)
        for freq in ch:audio+=.045*env*(np.sin(2*np.pi*freq*ts)+.18*np.sin(2*np.pi*freq*2.001*ts))
        audio+=.05*np.exp(-np.maximum(local,0)*2)*(local>=0)*np.sin(2*np.pi*ch[-1]*4*ts)
    audio*=np.minimum(ts/1.4,1)*np.clip((DURATION-ts)/1.5,0,1)
    stereo=np.stack([audio,audio*.98],axis=1);wav=Path(tmp)/'score.wav'
    with wave.open(str(wav),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((stereo*32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(silent),'-i',str(wav),'-c:v','copy','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',str(OUT/'fundmatch-film.mp4')],check=True)
print('Rendered 24-second 1280×720 H.264/AAC film, poster and original soundtrack.')
