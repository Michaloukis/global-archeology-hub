/**
 * Renders a single archaeological sculpture in technical line-drawing style:
 * left half = exterior (with optional decoration), right half = cross-section.
 */

import { forwardRef } from 'react';
import { DecorationPatterns, patternIdForType } from './decorationPatterns';

const WIDTH = 100;
const HEIGHT = 160;
const CENTER_X = 50;
const RADIUS_SCALE = 42;
const HEIGHT_SCALE = 120;
const BASE_Y = HEIGHT - 20;
const RIM_Y = 20;

function scaleY(y, heightScale) {
  return Math.max(0, Math.min(1, 0.5 + (y - 0.5) * heightScale));
}

function toSvg(profile, side, widthScale, heightScale) {
  const sign = side === 'right' ? 1 : -1;
  const points = profile.map(
    (p) => `${CENTER_X + sign * p.x * widthScale * RADIUS_SCALE},${BASE_Y - scaleY(p.y, heightScale) * HEIGHT_SCALE}`
  );
  return points.join(' ');
}

function getInteriorProfile(profile, wallThickness) {
  const thickness = (i) =>
    Array.isArray(wallThickness)
      ? wallThickness[Math.min(i, wallThickness.length - 1)]
      : wallThickness;
  return profile.map((p, i) => ({
    x: Math.max(0.02, p.x - thickness(i)),
    y: p.y,
  }));
}

function buildExteriorPath(profile, widthScale, heightScale) {
  const right = toSvg(profile, 'right', widthScale, heightScale);
  const left = toSvg([...profile].reverse(), 'left', widthScale, heightScale);
  return `M ${right} L ${left} Z`;
}

function buildSectionPath(exterior, interior, widthScale, heightScale) {
  const extRight = toSvg(exterior, 'right', widthScale, heightScale);
  const intRight = toSvg([...interior].reverse(), 'right', widthScale, heightScale);
  return `M ${extRight} L ${intRight} Z`;
}

function pathForBandRight(profile, interior, band, widthScale, heightScale) {
  const inBand = (y) => y >= band.fromY && y <= band.toY;
  const outerPts = profile.filter((p) => inBand(p.y));
  const innerPts = interior.filter((p) => inBand(p.y));
  if (outerPts.length < 2) return '';
  const outer = outerPts.map(
    (p) => `${CENTER_X + p.x * widthScale * RADIUS_SCALE},${BASE_Y - scaleY(p.y, heightScale) * HEIGHT_SCALE}`
  );
  const inner = [...innerPts].reverse().map(
    (p) => `${CENTER_X + p.x * widthScale * RADIUS_SCALE},${BASE_Y - scaleY(p.y, heightScale) * HEIGHT_SCALE}`
  );
  if (inner.length < 1) return '';
  return `M ${outer.join(' L ')} L ${inner.join(' L ')} Z`;
}

function pathForBand(profile, band, widthScale, heightScale) {
  const inBand = (y) => y >= band.fromY && y <= band.toY;
  const leftPoints = profile
    .filter((p) => inBand(p.y))
    .map((p) => `${CENTER_X - p.x * widthScale * RADIUS_SCALE},${BASE_Y - scaleY(p.y, heightScale) * HEIGHT_SCALE}`);
  if (leftPoints.length < 2) return '';
  const y0 = BASE_Y - scaleY(band.fromY, heightScale) * HEIGHT_SCALE;
  const y1 = BASE_Y - scaleY(band.toY, heightScale) * HEIGHT_SCALE;
  return `M ${CENTER_X},${y0} L ${leftPoints[0]} L ${leftPoints.slice(1).join(' L ')} L ${CENTER_X},${y1} Z`;
}

const SCALE_BAR_SIZE = 24;
const SCALE_BAR_Y = 152;
const SCALE_BAR_X_LEFT = 8;
const LABEL_Y = 10;

const FindIllustration = forwardRef(function FindIllustrationInner(
  { spec, className, scale = 1, label, scaleBar, referenceImageUrl, referenceImageOpacity },
  ref
) {
  const widthScale = Math.max(0.25, Math.min(2, spec.widthScale ?? 1));
  const heightScale = Math.max(0.25, Math.min(2, spec.heightScale ?? 1));
  const interior = getInteriorProfile(spec.profile, spec.wallThickness);
  const exteriorPath = buildExteriorPath(spec.profile, widthScale, heightScale);
  const sectionPath = buildSectionPath(spec.profile, interior, widthScale, heightScale);
  const centerLineY = [
    BASE_Y - scaleY(0, heightScale) * HEIGHT_SCALE,
    BASE_Y - scaleY(1, heightScale) * HEIGHT_SCALE,
  ];
  const showLabel = label !== undefined ? label : spec.label;
  const showScaleBar = scaleBar ?? undefined;

  const crop = spec.fragmentCrop;
  const hasCrop = !!(crop && (crop.minY > 0 || crop.maxY < 1));
  const cropClipId = `clip-crop-${spec.id}`;
  const cropSvgYTop = hasCrop ? BASE_Y - scaleY(crop.maxY, heightScale) * HEIGHT_SCALE : RIM_Y;
  const cropSvgYBottom = hasCrop ? BASE_Y - scaleY(crop.minY, heightScale) * HEIGHT_SCALE : BASE_Y;

  function cropBreakLineAt(sy) {
    const p = spec.profile.find((pt) => Math.abs((BASE_Y - scaleY(pt.y, heightScale) * HEIGHT_SCALE) - sy) < 8);
    const rx = p ? p.x * widthScale * RADIUS_SCALE : RADIUS_SCALE * 0.5 * widthScale;
    return (
      <path
        d={`M ${CENTER_X - rx} ${sy} Q ${CENTER_X - rx - 3} ${sy + 2} ${CENTER_X} ${sy} Q ${CENTER_X + rx + 2} ${sy - 2} ${CENTER_X + rx} ${sy}`}
        fill="none"
        strokeWidth={0.8}
        stroke="#000"
        strokeDasharray="1.5 1"
      />
    );
  }

  return (
    <svg
      ref={ref}
      className={className}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH * scale}
      height={HEIGHT * scale}
      style={{ overflow: 'visible' }}
    >
      <DecorationPatterns />
      {hasCrop && (
        <defs>
          <clipPath id={cropClipId}>
            <rect x={0} y={cropSvgYTop} width={WIDTH} height={cropSvgYBottom - cropSvgYTop} />
          </clipPath>
        </defs>
      )}
      {referenceImageUrl && (
        <image
          href={referenceImageUrl}
          x={0}
          y={0}
          width={WIDTH}
          height={HEIGHT}
          opacity={referenceImageOpacity ?? 0.35}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      {/* Label above figure */}
      {showLabel && (
        <text
          x={CENTER_X}
          y={LABEL_Y}
          textAnchor="middle"
          fontSize={4}
          fill="#000"
          fontFamily="system-ui, sans-serif"
        >
          {showLabel}
        </text>
      )}
      <g stroke="#000" fill="none" strokeLinejoin="round" clipPath={hasCrop ? `url(#${cropClipId})` : undefined}>
        {spec.singlePiece ? (
          /* ── Single piece: right-side cross-section only, no mirror ── */
          <>
            <path d={sectionPath} fill="#ddd" strokeWidth={1.2} stroke="#000" />
            {spec.decorationBands.map((band, i) => {
              const pid = patternIdForType(band.type);
              if (!pid) return null;
              const bandPath = pathForBandRight(spec.profile, interior, band, widthScale, heightScale);
              if (!bandPath) return null;
              return <path key={i} d={bandPath} fill={`url(#${pid})`} stroke="none" />;
            })}
          </>
        ) : (
          /* ── Standard: left = exterior, right = section ── */
          <>
            <clipPath id={`clip-left-${spec.id}`}>
              <path d={`M ${CENTER_X} ${RIM_Y} L ${CENTER_X} ${BASE_Y} L 0 ${BASE_Y} L 0 ${RIM_Y} Z`} />
            </clipPath>
            <g clipPath={`url(#clip-left-${spec.id})`}>
              <path d={exteriorPath} fill="#fff" strokeWidth={1.2} stroke="#000" />
              {spec.decorationBands.map((band, i) => {
                const pid = patternIdForType(band.type);
                if (!pid) return null;
                const bandPath = pathForBand(spec.profile, band, widthScale, heightScale);
                if (!bandPath) return null;
                return <path key={i} d={bandPath} fill={`url(#${pid})`} stroke="none" />;
              })}
            </g>
            <clipPath id={`clip-right-${spec.id}`}>
              <path d={`M ${CENTER_X} ${RIM_Y} L ${CENTER_X} ${BASE_Y} L ${WIDTH} ${BASE_Y} L ${WIDTH} ${RIM_Y} Z`} />
            </clipPath>
            <g clipPath={`url(#clip-right-${spec.id})`}>
              <path d={sectionPath} fill="#fff" strokeWidth={1} stroke="#000" />
            </g>
          </>
        )}

        {/* Base detail: ring or foot */}
        {spec.baseDetail === 'ring' && (() => {
          const baseRx = spec.profile[0]?.x ?? 0.1;
          const rx = baseRx * widthScale * RADIUS_SCALE;
          const ringOut = 5;
          const ringH = 2.5;
          if (spec.singlePiece) {
            return (
              <path
                d={`M ${CENTER_X + rx} ${BASE_Y} h ${ringOut} v ${ringH} H ${CENTER_X} V ${BASE_Y} Z`}
                fill="#ddd"
                stroke="#000"
                strokeWidth={1}
              />
            );
          }
          return (
            <>
              <g clipPath={`url(#clip-left-${spec.id})`}>
                <path
                  d={`M ${CENTER_X - rx} ${BASE_Y} h ${-ringOut} v ${ringH} H ${CENTER_X} V ${BASE_Y} Z`}
                  fill="#fff"
                  stroke="#000"
                  strokeWidth={1}
                />
              </g>
              <g clipPath={`url(#clip-right-${spec.id})`}>
                <path
                  d={`M ${CENTER_X} ${BASE_Y} h ${ringOut} v ${ringH} H ${CENTER_X} V ${BASE_Y} Z`}
                  fill="#fff"
                  stroke="#000"
                  strokeWidth={1}
                />
              </g>
            </>
          );
        })()}
        {spec.baseDetail === 'foot' && (() => {
          const baseRx = spec.profile[0]?.x ?? 0.1;
          const rx = baseRx * widthScale * RADIUS_SCALE;
          const footH = 5;
          const footTop = rx * 0.9;
          const footBottom = rx * 0.6;
          if (spec.singlePiece) {
            return (
              <path
                d={`M ${CENTER_X + footTop} ${BASE_Y} L ${CENTER_X + footBottom} ${BASE_Y + footH} H ${CENTER_X} V ${BASE_Y} Z`}
                fill="#ddd"
                stroke="#000"
                strokeWidth={1}
              />
            );
          }
          return (
            <>
              <g clipPath={`url(#clip-left-${spec.id})`}>
                <path
                  d={`M ${CENTER_X - footTop} ${BASE_Y} L ${CENTER_X - footBottom} ${BASE_Y + footH} L ${CENTER_X} ${BASE_Y + footH} L ${CENTER_X} ${BASE_Y} Z`}
                  fill="#fff"
                  stroke="#000"
                  strokeWidth={1}
                />
              </g>
              <g clipPath={`url(#clip-right-${spec.id})`}>
                <path
                  d={`M ${CENTER_X} ${BASE_Y} L ${CENTER_X + footTop} ${BASE_Y} L ${CENTER_X + footBottom} ${BASE_Y + footH} L ${CENTER_X} ${BASE_Y + footH} Z`}
                  fill="#fff"
                  stroke="#000"
                  strokeWidth={1}
                />
              </g>
            </>
          );
        })()}

        {/* Center line (bisector) — hidden in single piece mode */}
        {!spec.singlePiece && (
          <line
            x1={CENTER_X}
            y1={centerLineY[0]}
            x2={CENTER_X}
            y2={centerLineY[1]}
            strokeWidth={0.8}
            stroke="#000"
          />
        )}

        {/* Handles */}
        {(() => {
          const handleList = spec.handles ?? (spec.handle ? [spec.handle] : []);
          const xAt = (y) => {
            const closest = spec.profile.reduce((a, p) =>
              Math.abs(p.y - y) < Math.abs(a.y - y) ? p : a
            );
            return closest.x * widthScale * RADIUS_SCALE;
          };
          return handleList.map((h, i) => {
            const side = h.side === 'right' ? 'right' : 'left';
            const sign = side === 'right' ? 1 : -1;
            const xFrom = xAt(h.fromY);
            const xTo = xAt(h.toY);
            const out = h.outward ?? 0.3;
            const rOut = RADIUS_SCALE * (1 + out);
            const p0y = BASE_Y - scaleY(h.fromY, heightScale) * HEIGHT_SCALE;
            const p3y = BASE_Y - scaleY(h.toY, heightScale) * HEIGHT_SCALE;
            const midT = h.midT ?? 0.5;
            const t = Math.max(0.05, Math.min(0.95, midT));
            const denom = 1 - 2 * (1 - t) * t;
            const ctrlY = Math.abs(denom) > 0.001
              ? ((1 - t) * (1 - t) * p0y + t * t * p3y) / denom
              : (p0y + p3y) / 2;
            const apexYFallback = h.apexY ?? (h.fromY + h.toY) / 2;
            const ctrlYFinal = h.midT != null ? ctrlY : BASE_Y - scaleY(apexYFallback, heightScale) * HEIGHT_SCALE;
            const p0 = `${CENTER_X + sign * xFrom} ${p0y}`;
            const ctrl = `${CENTER_X + sign * rOut} ${ctrlYFinal}`;
            const p3 = `${CENTER_X + sign * xTo} ${p3y}`;
            if (spec.singlePiece) {
              return (
                <path key={i} d={`M ${p0} Q ${ctrl} ${p3}`} fill="none" strokeWidth={1} stroke="#000" />
              );
            }
            const clipId = side === 'right' ? `clip-right-${spec.id}` : `clip-left-${spec.id}`;
            return (
              <g key={i} clipPath={`url(#${clipId})`}>
                <path d={`M ${p0} Q ${ctrl} ${p3}`} fill="none" strokeWidth={1} stroke="#000" />
              </g>
            );
          });
        })()}

        {/* Fragment break lines */}
        {spec.isFragment &&
          (spec.breakLines ?? []).map((y, i) => {
            const sy = BASE_Y - scaleY(y, heightScale) * HEIGHT_SCALE;
            const p = spec.profile.find((pt) => Math.abs((BASE_Y - scaleY(pt.y, heightScale) * HEIGHT_SCALE) - sy) < 8);
            const rx = p ? p.x * widthScale * RADIUS_SCALE : RADIUS_SCALE * 0.5 * widthScale;
            return (
              <path
                key={i}
                d={`M ${CENTER_X - rx} ${sy} Q ${CENTER_X - rx - 3} ${sy + 2} ${CENTER_X} ${sy} Q ${CENTER_X + rx + 2} ${sy - 2} ${CENTER_X + rx} ${sy}`}
                fill="none"
                strokeWidth={0.6}
                stroke="#000"
                strokeDasharray="1 1"
              />
            );
          })}
      </g>
      {/* Crop boundary break lines rendered outside the crop clip */}
      {hasCrop && (
        <g stroke="#000" fill="none">
          {crop.maxY < 1 && cropBreakLineAt(cropSvgYTop)}
          {crop.minY > 0 && cropBreakLineAt(cropSvgYBottom)}
        </g>
      )}
      {/* Scale bar(s): horizontal below figure; optional vertical on left */}
      {showScaleBar && (
        <g stroke="#000" fill="none">
          {/* Horizontal scale bar */}
          <line
            x1={CENTER_X - SCALE_BAR_SIZE / 2}
            y1={SCALE_BAR_Y}
            x2={CENTER_X + SCALE_BAR_SIZE / 2}
            y2={SCALE_BAR_Y}
            strokeWidth={0.8}
          />
          <line
            x1={CENTER_X - SCALE_BAR_SIZE / 2}
            y1={SCALE_BAR_Y - 1.5}
            x2={CENTER_X - SCALE_BAR_SIZE / 2}
            y2={SCALE_BAR_Y + 1.5}
            strokeWidth={0.8}
          />
          <line
            x1={CENTER_X + SCALE_BAR_SIZE / 2}
            y1={SCALE_BAR_Y - 1.5}
            x2={CENTER_X + SCALE_BAR_SIZE / 2}
            y2={SCALE_BAR_Y + 1.5}
            strokeWidth={0.8}
          />
          <text
            x={CENTER_X}
            y={HEIGHT - 2}
            textAnchor="middle"
            fill="#000"
            fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
            fontSize={6}
            fontWeight="100"
          >
            {showScaleBar.length} {showScaleBar.unit}
          </text>
          {/* Vertical scale bar (own length/unit when set) */}
          {showScaleBar.showVertical && (
            <g>
              <line
                x1={SCALE_BAR_X_LEFT}
                y1={SCALE_BAR_Y}
                x2={SCALE_BAR_X_LEFT}
                y2={SCALE_BAR_Y - SCALE_BAR_SIZE}
                strokeWidth={0.8}
              />
              <line
                x1={SCALE_BAR_X_LEFT - 1.5}
                y1={SCALE_BAR_Y}
                x2={SCALE_BAR_X_LEFT + 1.5}
                y2={SCALE_BAR_Y}
                strokeWidth={0.8}
              />
              <line
                x1={SCALE_BAR_X_LEFT - 1.5}
                y1={SCALE_BAR_Y - SCALE_BAR_SIZE}
                x2={SCALE_BAR_X_LEFT + 1.5}
                y2={SCALE_BAR_Y - SCALE_BAR_SIZE}
                strokeWidth={0.8}
              />
              <text
                x={SCALE_BAR_X_LEFT - 4}
                y={SCALE_BAR_Y - SCALE_BAR_SIZE / 2}
                textAnchor="middle"
                fill="#000"
                fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
                fontSize={6}
                fontWeight="100"
                transform={`rotate(-90, ${SCALE_BAR_X_LEFT - 4}, ${SCALE_BAR_Y - SCALE_BAR_SIZE / 2})`}
              >
                {showScaleBar.verticalLength ?? showScaleBar.length} {showScaleBar.verticalUnit ?? showScaleBar.unit}
              </text>
            </g>
          )}
        </g>
      )}
    </svg>
  );
});

export default FindIllustration;
