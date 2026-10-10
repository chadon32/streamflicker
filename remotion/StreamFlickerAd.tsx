import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type Style = React.CSSProperties;

const C = {
  bg: '#070811',
  bg2: '#0d1020',
  ink: '#f8f8fb',
  muted: '#aab2c8',
  rose: '#ff4f79',
  amber: '#ffc45c',
  violet: '#7066ff',
  cyan: '#54e1ff',
  panel: 'rgba(13, 16, 32, 0.86)',
  line: 'rgba(255,255,255,0.12)',
};

const poster = (name: string) =>
  staticFile(`remotion/streamflicker-ad/assets/${name}`);
const sound = (name: string) =>
  staticFile(`remotion/streamflicker-ad/audio/${name}`);
const sfx = (name: string) =>
  staticFile(`remotion/streamflicker-ad/audio/sfx/${name}`);

const appear = (frame: number, start: number, duration = 22) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const drift = (frame: number, start: number, distance: number) =>
  interpolate(frame, [start, start + 150], [distance, -distance], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const ease = (frame: number, start: number, end: number, from: number, to: number) =>
  interpolate(frame, [start, end], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const fontStyle: Style = {
  fontFamily: 'SFInter, Inter, Arial, sans-serif',
};

const displayStyle: Style = {
  fontFamily: 'SFDisplay, Outfit, Arial, sans-serif',
  fontWeight: 900,
  letterSpacing: -4,
};

const chipStyle: Style = {
  border: `1px solid ${C.line}`,
  borderRadius: 999,
  background: 'rgba(8, 10, 20, 0.82)',
  color: C.muted,
  padding: '11px 18px',
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: 0.2,
  whiteSpace: 'nowrap',
};

const BrandMark: React.FC<{small?: boolean; light?: boolean}> = ({small = false, light = false}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: small ? 10 : 14, ...fontStyle}}>
    <div
      style={{
        width: small ? 34 : 46,
        height: small ? 34 : 46,
        borderRadius: small ? 10 : 14,
        display: 'grid',
        placeItems: 'center',
        background: `linear-gradient(135deg, ${C.rose}, ${C.amber})`,
        boxShadow: `0 12px 36px rgba(255, 79, 121, 0.28)`,
      }}
    >
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: `${small ? 8 : 11}px solid transparent`,
          borderBottom: `${small ? 8 : 11}px solid transparent`,
          borderLeft: `${small ? 13 : 18}px solid ${light ? '#140a12' : '#fff'}`,
          transform: 'translateX(2px)',
        }}
      />
    </div>
    <div style={{fontSize: small ? 24 : 34, fontWeight: 900, letterSpacing: -1.6, color: light ? '#fff' : C.ink}}>
      Stream<span style={{color: C.rose}}>Flicker</span>
    </div>
  </div>
);

const Wallpaper: React.FC<{ghost?: string; accent?: string}> = ({ghost = 'FIND YOUR FLICKER', accent = C.violet}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: C.bg}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 75% 28%, ${accent}35 0, transparent 35%), radial-gradient(circle at 17% 80%, ${C.rose}25 0, transparent 34%), ${C.bg}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.18,
          backgroundImage: 'linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)',
          backgroundSize: '96px 96px',
          transform: `translate(${drift(frame, 0, 12)}px, ${drift(frame, 0, -7)}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -120,
          bottom: -270,
          width: 780,
          height: 780,
          border: `1px solid ${accent}35`,
          borderRadius: '50%',
          transform: `rotate(${frame * 0.12}deg)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -230,
          top: -320,
          width: 860,
          height: 860,
          border: `1px solid ${C.rose}35`,
          borderRadius: '50%',
          transform: `rotate(${-frame * 0.08}deg)`,
        }}
      />
      <div
        style={{
          ...displayStyle,
          position: 'absolute',
          right: -30,
          bottom: -20,
          fontSize: 162,
          color: 'rgba(255,255,255,0.045)',
          transform: `translateY(${Math.sin(frame / 26) * 12}px) rotate(-5deg)`,
          whiteSpace: 'nowrap',
        }}
      >
        {ghost}
      </div>
    </AbsoluteFill>
  );
};

const Header: React.FC<{frame: number}> = ({frame}) => (
  <div
    style={{
      position: 'absolute',
      top: 58,
      left: 94,
      right: 94,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      opacity: appear(frame, 0, 18),
      zIndex: 20,
    }}
  >
    <BrandMark small />
    <div style={{...fontStyle, color: 'rgba(248,248,251,.52)', fontSize: 16, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase'}}>
      Movie discovery / 01—06
    </div>
  </div>
);

const Kicker: React.FC<{children: React.ReactNode; frame: number; color?: string; top?: number}> = ({children, frame, color = C.muted, top = 190}) => (
  <div
    style={{
      position: 'absolute',
      left: 112,
      top,
      color,
      fontSize: 18,
      fontWeight: 800,
      letterSpacing: 5,
      textTransform: 'uppercase',
      opacity: appear(frame, 12, 18),
      ...fontStyle,
      zIndex: 15,
    }}
  >
    {children}
  </div>
);

const Caption: React.FC<{children: React.ReactNode; frame: number; accent?: string}> = ({children, frame, accent = C.rose}) => (
  <div
    style={{
      position: 'absolute',
      left: 112,
      bottom: 70,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      color: C.ink,
      fontSize: 20,
      fontWeight: 700,
      letterSpacing: 0.2,
      opacity: appear(frame, 48, 18),
      transform: `translateY(${ease(frame, 48, 66, 18, 0)}px)`,
      ...fontStyle,
      zIndex: 30,
    }}
  >
    <span style={{width: 56, height: 4, borderRadius: 99, background: accent, boxShadow: `0 0 24px ${accent}`}} />
    <span>{children}</span>
  </div>
);

const Poster: React.FC<{name: string; style?: Style; alt?: string}> = ({name, style, alt = ''}) => (
  <Img src={poster(name)} alt={alt} style={{display: 'block', objectFit: 'cover', ...style}} />
);

const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const posters = [
    {name: 'alien-poster.jpg', x: 1300, y: 170, r: -13, scale: 0.86, delay: 8},
    {name: 'inception-poster.jpg', x: 1518, y: 270, r: 9, scale: 0.74, delay: 18},
    {name: 'interstellar-poster.jpg', x: 1288, y: 520, r: 8, scale: 0.76, delay: 28},
    {name: 'mad-max-fury-road-poster.jpg', x: 1590, y: 610, r: -14, scale: 0.64, delay: 36},
    {name: 'the-revenant-poster.jpg', x: 1030, y: 650, r: -4, scale: 0.52, delay: 46},
  ];
  return (
    <AbsoluteFill>
      <Wallpaper ghost="TOO MANY TABS" accent={C.violet} />
      <Header frame={frame} />
      <Kicker frame={frame}>A new way to watch</Kicker>
      <div style={{position: 'absolute', left: 112, top: 300, zIndex: 10, ...displayStyle}}>
        <div style={{fontSize: 104, lineHeight: 0.92, color: C.ink, opacity: appear(frame, 14, 24), transform: `translateY(${ease(frame, 14, 38, 44, 0)}px)`}}>Finding your</div>
        <div style={{fontSize: 104, lineHeight: 0.92, color: C.rose, opacity: appear(frame, 23, 24), transform: `translateY(${ease(frame, 23, 47, 46, 0)}px)`, textShadow: `0 0 46px ${C.rose}55`}}>next movie</div>
        <div style={{fontSize: 104, lineHeight: 0.92, color: C.ink, opacity: appear(frame, 32, 24), transform: `translateY(${ease(frame, 32, 56, 46, 0)}px)`}}>shouldn’t feel</div>
        <div style={{fontSize: 104, lineHeight: 0.92, color: C.amber, opacity: appear(frame, 41, 24), transform: `translateY(${ease(frame, 41, 65, 46, 0)}px)`}}>like a guess.</div>
      </div>
      <div style={{position: 'absolute', left: 118, top: 756, color: C.muted, fontSize: 25, opacity: appear(frame, 66, 18), ...fontStyle}}>A signal for your mood, not another endless shelf.</div>
      <div style={{position: 'absolute', left: 1294, top: 154, width: 480, height: 730, border: `1px solid ${C.violet}48`, borderRadius: 32, transform: `rotate(${ease(frame, 0, 150, -8, 3)}deg)`, opacity: 0.55}} />
      {posters.map((item, index) => (
        <div key={item.name} style={{position: 'absolute', left: item.x, top: item.y, transform: `translate(${drift(frame, item.delay, 42)}px, ${Math.sin((frame + index * 18) / 23) * 10}px) rotate(${item.r + Math.sin((frame + index * 12) / 35) * 1.4}deg) scale(${item.scale})`, transformOrigin: 'center', opacity: appear(frame, item.delay, 24), filter: index === 0 ? 'saturate(1.15)' : 'saturate(.8)', zIndex: 8 - index}}>
          <Poster name={item.name} style={{width: 318, height: 478, borderRadius: 22, boxShadow: '0 30px 80px rgba(0,0,0,.48)'}} />
        </div>
      ))}
      <div style={{position: 'absolute', left: 1240, top: 380, width: 570, height: 570, border: `2px solid ${C.rose}55`, borderRadius: '50%', opacity: appear(frame, 8, 20), transform: `rotate(${frame * 0.2}deg)`}} />
      <div style={{position: 'absolute', left: 1482, top: 504, width: 92, height: 92, display: 'grid', placeItems: 'center', borderRadius: '50%', background: C.rose, color: '#1a0710', fontSize: 56, fontWeight: 900, opacity: appear(frame, 52, 18), transform: `scale(${ease(frame, 52, 70, .3, 1)})`, boxShadow: `0 0 60px ${C.rose}88`, ...fontStyle}}>?</div>
      <Caption frame={frame} accent={C.rose}>Finding the right movie shouldn’t feel like a guess.</Caption>
    </AbsoluteFill>
  );
};

const ProductBar: React.FC = () => (
  <div style={{height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.line}`, color: C.muted, ...fontStyle}}>
    <div style={{display: 'flex', gap: 10, alignItems: 'center'}}><span style={{width: 8, height: 8, borderRadius: '50%', background: C.rose}} /><span style={{fontSize: 14, fontWeight: 800, letterSpacing: 2}}>STREAMFLICKER</span></div>
    <div style={{display: 'flex', gap: 18, fontSize: 13, fontWeight: 700, opacity: 0.65}}><span>Discover</span><span>Watchlist</span><span>About</span></div>
  </div>
);

const SceneSearch: React.FC = () => {
  const frame = useCurrentFrame();
  const chips = [
    {label: '#ZombieOutbreak', x: 0, y: 0, color: C.rose, delay: 52},
    {label: '#PostApocalyptic', x: 206, y: 0, color: C.violet, delay: 61},
    {label: '#FoundFootage', x: 0, y: 76, color: C.cyan, delay: 70},
    {label: 'Date night', x: 218, y: 76, color: C.amber, delay: 79},
    {label: 'Family night', x: 0, y: 152, color: C.amber, delay: 88},
    {label: 'No spoilers', x: 214, y: 152, color: C.rose, delay: 97},
  ];
  return (
    <AbsoluteFill>
      <Wallpaper ghost="SEARCH THE IDEA" accent={C.cyan} />
      <Header frame={frame} />
      <Kicker frame={frame} color={C.cyan}>Search by mood, not just title</Kicker>
      <div style={{position: 'absolute', left: 112, top: 308, zIndex: 15, ...displayStyle}}>
        <div style={{fontSize: 112, lineHeight: 0.9, color: C.ink, opacity: appear(frame, 14, 22), transform: `translateX(${ease(frame, 14, 36, -70, 0)}px)`}}>Say less.</div>
        <div style={{fontSize: 112, lineHeight: 0.9, color: C.cyan, opacity: appear(frame, 27, 22), transform: `translateX(${ease(frame, 27, 49, -70, 0)}px)`, textShadow: `0 0 44px ${C.cyan}55`}}>Find more.</div>
        <div style={{fontSize: 25, color: C.muted, marginTop: 32, opacity: appear(frame, 55, 18), fontWeight: 500, letterSpacing: 0.2, ...fontStyle}}>Type a vibe. Tap a short tag.</div>
      </div>
      <div style={{position: 'absolute', left: 820, top: 198, width: 846, height: 686, padding: '0 28px', borderRadius: 28, border: `1px solid ${C.line}`, background: C.panel, boxShadow: '0 42px 90px rgba(0,0,0,.38)', opacity: appear(frame, 8, 22), transform: `translateY(${ease(frame, 8, 30, 70, 0)}px) scale(${ease(frame, 8, 30, .94, 1)})`, zIndex: 10, ...fontStyle}}>
        <ProductBar />
        <div style={{marginTop: 32, display: 'flex', alignItems: 'center', gap: 18, height: 74, border: `1px solid ${C.cyan}88`, borderRadius: 18, padding: '0 24px', background: 'rgba(5,9,18,.88)', boxShadow: `0 0 50px ${C.cyan}1c`}}>
          <div style={{width: 28, height: 28, border: `3px solid ${C.cyan}`, borderRadius: '50%', position: 'relative'}}><div style={{position: 'absolute', width: 14, height: 3, borderRadius: 3, background: C.cyan, right: -10, bottom: -5, transform: 'rotate(45deg)'}} /></div>
          <div style={{fontSize: 28, color: C.ink, fontWeight: 700, letterSpacing: 0.2}}>zombie movies</div>
          <div style={{width: 3, height: 32, background: frame % 28 < 15 ? C.cyan : 'transparent', borderRadius: 3, marginLeft: -8}} />
          <div style={{marginLeft: 'auto', fontSize: 13, color: C.cyan, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 800}}>smart search</div>
        </div>
        <div style={{marginTop: 38, display: 'flex', gap: 14, alignItems: 'center', color: C.muted, fontSize: 17, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase'}}>Short tags <span style={{height: 1, flex: 1, background: C.line}} /></div>
        <div style={{position: 'relative', marginTop: 24, height: 244}}>
          {chips.map((chip) => (
            <div key={chip.label} style={{position: 'absolute', left: chip.x, top: chip.y, ...chipStyle, borderColor: `${chip.color}75`, color: chip.color, opacity: appear(frame, chip.delay, 18), transform: `translateY(${ease(frame, chip.delay, chip.delay + 18, 26, 0)}px) scale(${ease(frame, chip.delay, chip.delay + 18, .88, 1)})`, boxShadow: `0 0 28px ${chip.color}1c`}}>{chip.label}</div>
          ))}
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', color: 'rgba(248,248,251,.46)', fontSize: 14, fontWeight: 700, letterSpacing: 1.4}}><span>Title / actor / genre / short tag</span><span>SMART MATCH <b style={{color: C.cyan}}>02</b></span></div>
      </div>
      <Caption frame={frame} accent={C.cyan}>Search the idea. Tap a short tag.</Caption>
    </AbsoluteFill>
  );
};

const MiniPoster: React.FC<{name: string; index: number; frame: number}> = ({name, index, frame}) => (
  <div style={{width: 145, height: 215, borderRadius: 16, overflow: 'hidden', opacity: appear(frame, 46 + index * 10, 18), transform: `translateY(${ease(frame, 46 + index * 10, 64 + index * 10, 28, 0)}px) rotate(${(index - 1.5) * 1.4}deg)`, boxShadow: '0 18px 36px rgba(0,0,0,.35)'}}>
    <Poster name={name} style={{width: '100%', height: '100%'}} />
  </div>
);

const SceneFilter: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Wallpaper ghost="FOCUS THE FEED" accent={C.rose} />
      <Header frame={frame} />
      <Kicker frame={frame} color={C.rose}>Curated signals, zero guesswork</Kicker>
      <div style={{position: 'absolute', left: 112, top: 332, zIndex: 15, ...displayStyle}}>
        <div style={{fontSize: 112, lineHeight: .9, color: C.ink, opacity: appear(frame, 15, 22), transform: `translateX(${ease(frame, 15, 37, -60, 0)}px)`}}>Filter the</div>
        <div style={{fontSize: 112, lineHeight: .9, color: C.rose, opacity: appear(frame, 28, 22), transform: `translateX(${ease(frame, 28, 50, -60, 0)}px)`, textShadow: `0 0 44px ${C.rose}55`}}>noise.</div>
        <div style={{fontSize: 25, color: C.muted, marginTop: 32, opacity: appear(frame, 58, 18), fontWeight: 500, letterSpacing: 0.2, ...fontStyle}}>Stack a tag with runtime, provider, and guardrails.</div>
      </div>
      <div style={{position: 'absolute', left: 830, top: 174, width: 900, height: 728, borderRadius: 30, border: `1px solid ${C.line}`, background: 'rgba(13,16,32,.88)', boxShadow: '0 42px 90px rgba(0,0,0,.42)', opacity: appear(frame, 6, 24), transform: `translateY(${ease(frame, 6, 30, 76, 0)}px)`, zIndex: 10, ...fontStyle}}>
        <div style={{padding: '28px 32px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><div><div style={{fontSize: 24, fontWeight: 900, color: C.ink}}>Tonight’s signal</div><div style={{fontSize: 15, color: C.muted, marginTop: 6}}>Showing 24 focused titles</div></div><div style={{color: C.cyan, fontSize: 14, fontWeight: 800, letterSpacing: 2}}>FILTER DECK</div></div>
        <div style={{padding: '28px 32px'}}>
          <div style={{fontSize: 15, color: C.muted, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 800}}>Your filters</div>
          <div style={{display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap'}}>
            {['#ZombieOutbreak', '#PostApocalyptic', 'Under 2h', 'No spoilers'].map((label, index) => (
              <div key={label} style={{...chipStyle, padding: '10px 16px', fontSize: 16, color: index === 0 ? C.rose : C.ink, borderColor: index === 0 ? `${C.rose}90` : C.line, background: index === 0 ? `${C.rose}15` : 'rgba(255,255,255,.03)', opacity: appear(frame, 38 + index * 11, 18), transform: `scale(${ease(frame, 38 + index * 11, 56 + index * 11, .88, 1)})`}}>{label}</div>
            ))}
          </div>
          <div style={{marginTop: 22, color: C.muted, fontSize: 16}}>Also works for <b style={{color: C.amber}}>Date night</b> · <b style={{color: C.cyan}}>Family night</b> · <b style={{color: C.rose}}>Deep cuts</b></div>
          <div style={{display: 'flex', gap: 16, marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.line}`}}>
            {['zombieland-poster.jpg', '28-days-later-poster.jpg', 'dawn-of-the-dead-poster.jpg', 'world-war-z-poster.jpg'].map((name, index) => <MiniPoster key={name} name={name} index={index} frame={frame} />)}
          </div>
          <div style={{marginTop: 22, display: 'flex', alignItems: 'center', gap: 14, color: C.muted, fontSize: 15, fontWeight: 700}}><span style={{width: 10, height: 10, background: C.rose, borderRadius: '50%', boxShadow: `0 0 16px ${C.rose}`}} />24 titles match your signal <span style={{marginLeft: 'auto', color: C.rose}}>refine →</span></div>
        </div>
      </div>
      <Caption frame={frame} accent={C.rose}>One tag becomes a focused shelf.</Caption>
    </AbsoluteFill>
  );
};

const SceneMatch: React.FC = () => {
  const frame = useCurrentFrame();
  const ring = ease(frame, 50, 92, 0, 302);
  return (
    <AbsoluteFill>
      <Wallpaper ghost="A SIGNAL FOR TONIGHT" accent={C.amber} />
      <Header frame={frame} />
      <Kicker frame={frame} color={C.amber}>A match for your moment</Kicker>
      <div style={{position: 'absolute', left: 112, top: 344, zIndex: 15, ...displayStyle}}>
        <div style={{fontSize: 112, lineHeight: .9, color: C.ink, opacity: appear(frame, 15, 22), transform: `translateX(${ease(frame, 15, 37, -60, 0)}px)`}}>See the</div>
        <div style={{fontSize: 112, lineHeight: .9, color: C.amber, opacity: appear(frame, 28, 22), transform: `translateX(${ease(frame, 28, 50, -60, 0)}px)`, textShadow: `0 0 44px ${C.amber}55`}}>why it fits.</div>
        <div style={{fontSize: 25, color: C.muted, marginTop: 32, opacity: appear(frame, 58, 18), fontWeight: 500, letterSpacing: 0.2, ...fontStyle}}>Match score, rating, runtime, and the reason.</div>
      </div>
      <div style={{position: 'absolute', left: 970, top: 198, width: 700, height: 700, borderRadius: 38, border: `1px solid ${C.amber}55`, background: 'rgba(13,16,32,.72)', boxShadow: '0 42px 110px rgba(0,0,0,.46)', opacity: appear(frame, 8, 22), transform: `translateX(${ease(frame, 8, 34, 90, 0)}px) rotate(${ease(frame, 8, 150, 4, 0)}deg)`, zIndex: 10, ...fontStyle}}>
        <div style={{position: 'absolute', top: 28, left: 30, color: C.amber, fontSize: 14, letterSpacing: 3, fontWeight: 800}}>STREAMFLICKER SIGNAL</div>
        <div style={{position: 'absolute', top: 82, left: 48, width: 300, height: 454, borderRadius: 24, overflow: 'hidden', transform: `translateY(${ease(frame, 36, 62, 40, 0)}px)`, opacity: appear(frame, 36, 22), boxShadow: '0 28px 50px rgba(0,0,0,.48)'}}><Poster name="i-am-legend-poster.jpg" style={{width: '100%', height: '100%'}} /></div>
        <div style={{position: 'absolute', left: 392, top: 108, color: C.ink, fontSize: 42, fontWeight: 900, ...displayStyle, letterSpacing: -1.6, opacity: appear(frame, 48, 20), transform: `translateY(${ease(frame, 48, 68, 34, 0)}px)`}}>I Am Legend</div>
        <div style={{position: 'absolute', left: 394, top: 172, color: C.rose, fontSize: 18, fontWeight: 800, letterSpacing: 2, opacity: appear(frame, 57, 18), ...fontStyle}}>98% MATCH / ZOMBIE THRILLER</div>
        <div style={{position: 'absolute', left: 394, top: 220, color: C.muted, fontSize: 17, opacity: appear(frame, 65, 18), ...fontStyle}}>PG-13 · 1h 41m · Critics + community</div>
        <div style={{position: 'absolute', left: 388, top: 312, width: 174, height: 174, borderRadius: '50%', border: `8px solid ${C.amber}22`, borderTopColor: C.amber, borderRightColor: C.amber, transform: `rotate(${ring}deg)`, opacity: appear(frame, 42, 24), boxShadow: `0 0 50px ${C.amber}26`}} />
        <div style={{position: 'absolute', left: 419, top: 348, color: C.amber, fontSize: 58, fontWeight: 900, opacity: appear(frame, 55, 20), ...displayStyle, letterSpacing: -2}}>98</div>
        <div style={{position: 'absolute', left: 436, top: 416, color: C.muted, fontSize: 14, fontWeight: 800, letterSpacing: 2, opacity: appear(frame, 62, 18), ...fontStyle}}>MATCH</div>
        <div style={{position: 'absolute', left: 48, bottom: 46, right: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 22, borderTop: `1px solid ${C.line}`, color: C.muted, fontSize: 16, fontWeight: 700, opacity: appear(frame, 78, 18), ...fontStyle}}><span>Curated from your mood</span><span style={{color: C.amber}}>Why this fits →</span></div>
      </div>
      <div style={{position: 'absolute', left: 1225, top: 310, width: 520, height: 520, border: `1px solid ${C.amber}45`, borderRadius: '50%', transform: `rotate(${frame * .18}deg)`, opacity: .65}} />
      <Caption frame={frame} accent={C.amber}>See the rating, runtime, and why it fits.</Caption>
    </AbsoluteFill>
  );
};

const SceneAction: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Wallpaper ghost="FROM DISCOVERY TO PLAY" accent={C.cyan} />
      <Header frame={frame} />
      <Kicker frame={frame} color={C.cyan}>From discovery to play</Kicker>
      <div style={{position: 'absolute', left: 112, top: 340, zIndex: 15, ...displayStyle}}>
        <div style={{fontSize: 112, lineHeight: .9, color: C.ink, opacity: appear(frame, 15, 22), transform: `translateX(${ease(frame, 15, 37, -60, 0)}px)`}}>Press play.</div>
        <div style={{fontSize: 112, lineHeight: .9, color: C.cyan, opacity: appear(frame, 28, 22), transform: `translateX(${ease(frame, 28, 50, -60, 0)}px)`, textShadow: `0 0 44px ${C.cyan}55`}}>Stay awhile.</div>
        <div style={{fontSize: 25, color: C.muted, marginTop: 32, opacity: appear(frame, 58, 18), fontWeight: 500, letterSpacing: 0.2, ...fontStyle}}>Trailer, provider, watchlist. One clean handoff.</div>
      </div>
      <div style={{position: 'absolute', left: 900, top: 178, width: 840, height: 700, borderRadius: 30, border: `1px solid ${C.line}`, background: 'rgba(13,16,32,.84)', boxShadow: '0 42px 90px rgba(0,0,0,.42)', opacity: appear(frame, 8, 22), transform: `translateY(${ease(frame, 8, 34, 64, 0)}px)`, zIndex: 10, ...fontStyle}}>
        <div style={{padding: '22px 28px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: 15, fontWeight: 800, letterSpacing: 2}}><span>THE MARTIAN / TRAILER</span><span style={{color: C.cyan}}>READY TO WATCH</span></div>
        <div style={{position: 'relative', margin: 28, height: 414, borderRadius: 22, overflow: 'hidden', background: '#05060b'}}>
          <Poster name="the-martian-poster.jpg" style={{width: '100%', height: '100%', opacity: .72, transform: `scale(${ease(frame, 28, 150, 1.08, 1.14)})`}} />
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(3,4,10,.72), rgba(3,4,10,.08) 62%, rgba(3,4,10,.7))'}} />
          <div style={{position: 'absolute', left: 42, top: 42, color: C.ink, fontSize: 30, fontWeight: 900, ...displayStyle, letterSpacing: -1}}>Play the trailer</div>
          <div style={{position: 'absolute', left: 42, bottom: 40, display: 'flex', alignItems: 'center', gap: 18, color: C.muted, fontSize: 16, fontWeight: 700}}><div style={{width: 58, height: 58, borderRadius: '50%', background: C.cyan, display: 'grid', placeItems: 'center', boxShadow: `0 0 46px ${C.cyan}88`}}><div style={{width: 0, height: 0, borderTop: '11px solid transparent', borderBottom: '11px solid transparent', borderLeft: '18px solid #061019', transform: 'translateX(3px)'}} /></div>02:14 · Official trailer</div>
          <div style={{position: 'absolute', left: 36, right: 36, bottom: 18, height: 4, borderRadius: 99, background: 'rgba(255,255,255,.2)'}}><div style={{width: `${Math.min(100, ease(frame, 32, 148, 0, 64))}%`, height: '100%', borderRadius: 99, background: C.cyan}} /></div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px'}}>
          {['MAX', 'HULU', 'SAVE TO WATCHLIST', 'SHARE'].map((label, index) => <div key={label} style={{...chipStyle, padding: index > 1 ? '10px 16px' : '10px 18px', fontSize: 14, color: index === 2 ? C.rose : index === 0 ? '#fff' : index === 1 ? '#1d3' : C.muted, borderColor: index === 2 ? `${C.rose}80` : C.line, opacity: appear(frame, 58 + index * 12, 18), transform: `translateY(${ease(frame, 58 + index * 12, 76 + index * 12, 22, 0)}px)`}}>{label}</div>)}
        </div>
        <div style={{position: 'absolute', right: 28, bottom: -38, padding: '14px 22px', borderRadius: 14, background: C.rose, color: '#250610', fontSize: 16, fontWeight: 900, boxShadow: `0 14px 38px ${C.rose}55`, opacity: appear(frame, 96, 18), transform: `translateY(${ease(frame, 96, 114, 28, 0)}px)`, ...fontStyle}}>✓ Saved to Watchlist</div>
      </div>
      <Caption frame={frame} accent={C.cyan}>Trailer, provider, watchlist — one clean handoff.</Caption>
    </AbsoluteFill>
  );
};

const SceneResolve: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = [
    {name: 'scream-7-poster.jpg', x: 88, y: 200, r: -10},
    {name: 'the-revenant-poster.jpg', x: 1608, y: 130, r: 9},
    {name: 'zombieland-poster.jpg', x: 1540, y: 650, r: -8},
    {name: 'interstellar-poster.jpg', x: 210, y: 720, r: 8},
  ];
  return (
    <AbsoluteFill>
      <Wallpaper ghost="START EXPLORING" accent={C.rose} />
      {cards.map((card, index) => <div key={card.name} style={{position: 'absolute', left: card.x, top: card.y, opacity: appear(frame, 20 + index * 10, 24), transform: `rotate(${card.r}deg) scale(${ease(frame, 20 + index * 10, 44 + index * 10, .8, 1)})`, zIndex: 2}}><Poster name={card.name} style={{width: 230, height: 344, borderRadius: 20, boxShadow: '0 28px 60px rgba(0,0,0,.52)'}} /></div>)}
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 44%, rgba(112,102,255,.18), rgba(7,8,17,.96) 62%)', zIndex: 4}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 138, display: 'flex', justifyContent: 'center', opacity: appear(frame, 18, 24), transform: `translateY(${ease(frame, 18, 42, 30, 0)}px)`, zIndex: 10}}><BrandMark /></div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 252, textAlign: 'center', color: C.ink, fontSize: 27, fontWeight: 700, opacity: appear(frame, 42, 18), ...fontStyle, zIndex: 10}}>Less noise. More magic. Find what feels like you.</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 392, textAlign: 'center', color: C.ink, fontSize: 82, lineHeight: .94, ...displayStyle, opacity: appear(frame, 62, 26), transform: `scale(${ease(frame, 62, 88, .88, 1)})`, zIndex: 10}}>Your next movie<br /><span style={{color: C.rose}}>starts here.</span></div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 620, display: 'flex', justifyContent: 'center', gap: 16, opacity: appear(frame, 86, 20), transform: `translateY(${ease(frame, 86, 106, 30, 0)}px)`, zIndex: 10}}><div style={{padding: '18px 32px', borderRadius: 999, background: C.rose, color: '#270610', fontSize: 19, fontWeight: 900, boxShadow: `0 18px 48px ${C.rose}55`, ...fontStyle}}>Start exploring →</div><div style={{padding: '18px 28px', borderRadius: 999, border: `1px solid ${C.line}`, color: C.ink, fontSize: 19, fontWeight: 800, background: 'rgba(8,10,20,.72)', ...fontStyle}}>streamflicker.vercel.app</div></div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 70, textAlign: 'center', color: C.muted, fontSize: 15, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', opacity: appear(frame, 105, 18), ...fontStyle, zIndex: 10}}>Search · short tags · trailers · watchlists · streaming discovery</div>
    </AbsoluteFill>
  );
};

const Scene: React.FC<{start: number; children: React.ReactNode}> = ({start, children}) => (
  <Sequence from={start} durationInFrames={150}>{children}</Sequence>
);

const AudioBed: React.FC = () => (
  <>
    <Audio src={sound('underscore-30s.wav')} volume={0.26} />
    <Audio src={sound('narration.wav')} volume={1} />
    <Sequence from={3} durationInFrames={24}><Audio src={sfx('whoosh.mp3')} volume={0.1} /></Sequence>
    <Sequence from={156} durationInFrames={20}><Audio src={sfx('click.mp3')} volume={0.1} /></Sequence>
    <Sequence from={205} durationInFrames={26}><Audio src={sfx('ping.mp3')} volume={0.1} /></Sequence>
    <Sequence from={306} durationInFrames={24}><Audio src={sfx('whoosh.mp3')} volume={0.1} /></Sequence>
    <Sequence from={350} durationInFrames={26}><Audio src={sfx('ping.mp3')} volume={0.1} /></Sequence>
    <Sequence from={486} durationInFrames={24}><Audio src={sfx('whoosh.mp3')} volume={0.1} /></Sequence>
    <Sequence from={590} durationInFrames={20}><Audio src={sfx('click.mp3')} volume={0.1} /></Sequence>
    <Sequence from={748} durationInFrames={24}><Audio src={sfx('whoosh.mp3')} volume={0.1} /></Sequence>
  </>
);

export const StreamFlickerAd: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: C.bg, color: C.ink, overflow: 'hidden'}}>
      <style>{`
        @font-face { font-family: SFInter; src: url('${staticFile('remotion/streamflicker-ad/fonts/inter.ttf')}') format('truetype'); font-weight: 100 900; }
        @font-face { font-family: SFDisplay; src: url('${staticFile('remotion/streamflicker-ad/fonts/outfit.ttf')}') format('truetype'); font-weight: 100 900; }
        * { box-sizing: border-box; }
      `}</style>
      <Scene start={0}><SceneHook /></Scene>
      <Scene start={150}><SceneSearch /></Scene>
      <Scene start={300}><SceneFilter /></Scene>
      <Scene start={450}><SceneMatch /></Scene>
      <Scene start={600}><SceneAction /></Scene>
      <Scene start={750}><SceneResolve /></Scene>
      <AudioBed />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, background: 'rgba(255,255,255,.1)', zIndex: 50}}><div style={{height: '100%', width: `${(frame / Math.max(durationInFrames - 1, 1)) * 100}%`, background: `linear-gradient(90deg, ${C.rose}, ${C.amber}, ${C.cyan})`}} /></div>
    </AbsoluteFill>
  );
};
