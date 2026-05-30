"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  boxToOverlayStyle,
  getObjectContainLayout,
  type FaceBox,
  type ObjectContainLayout,
} from "@/lib/face-detection/region";

type Landmark = { x: number; y: number; label: string };

type FaceOverlayReport = {
  width: number;
  height: number;
  faces: Array<{
    id: string;
    box: FaceBox;
    quality: number;
    landmarks: Landmark[];
  }>;
  suspiciousRegions: FaceBox[];
};

type FaceOverlayPanelProps = {
  imageUrl: string;
  imageAlt: string;
  report?: FaceOverlayReport;
  className?: string;
  frameClassName?: string;
};

export function FaceOverlayPanel({
  imageUrl,
  imageAlt,
  report,
  className,
  frameClassName = "relative h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-black/35",
}: FaceOverlayPanelProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<ObjectContainLayout | null>(null);

  const updateLayout = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || !report) {
      setLayout(null);
      return;
    }
    const rect = frame.getBoundingClientRect();
    setLayout(getObjectContainLayout(rect.width, rect.height, report.width, report.height));
  }, [report]);

  useEffect(() => {
    updateLayout();
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => updateLayout());
    observer.observe(frame);
    window.addEventListener("resize", updateLayout);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateLayout);
    };
  }, [updateLayout, imageUrl]);

  return (
    <div className={className}>
      <div ref={frameRef} className={frameClassName}>
        <Image src={imageUrl} alt={imageAlt} fill unoptimized className="object-contain" onLoad={updateLayout} />
        {report && layout
          ? report.faces.map((face) => {
              const style = boxToOverlayStyle(face.box, report.width, report.height, layout);
              return (
                <div
                  key={face.id}
                  className="pointer-events-none absolute border border-cyan-200/80 bg-cyan-300/[0.055] shadow-[0_0_22px_rgba(83,244,255,.28)]"
                  style={style}
                >
                  <span className="absolute -top-7 left-0 whitespace-nowrap rounded-full border border-cyan-200/30 bg-sentra-ink/80 px-2 py-1 text-[10px] text-cyan-100">
                    FACE {face.quality}%
                  </span>
                </div>
              );
            })
          : null}
        {report && layout
          ? report.faces.flatMap((face) =>
              face.landmarks.map((point) => {
                const style = boxToOverlayStyle(
                  { x: point.x, y: point.y, width: 0, height: 0 },
                  report.width,
                  report.height,
                  layout,
                );
                return (
                  <span
                    key={`${face.id}-${point.label}`}
                    className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-100 shadow-[0_0_12px_rgba(83,244,255,.8)]"
                    style={{ left: style.left, top: style.top }}
                  />
                );
              }),
            )
          : null}
        {report && layout
          ? report.suspiciousRegions.map((region, index) => (
              <span
                key={index}
                className="pointer-events-none absolute border border-rose-300/70 bg-rose-400/[0.09]"
                style={boxToOverlayStyle(region, report.width, report.height, layout)}
              />
            ))
          : null}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-cyan-300/[0.14] to-transparent" />
      </div>
    </div>
  );
}
