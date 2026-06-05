import svgPaths from "./svg-eq7fndnzhy";
import imgVcg211320995760 from "./7195e4c130f8b3c877e6da85a022c6ec0eb51e11.png";
import imgImage2 from "./7dc496ad06d39f36268f66791d788c49cfe68f82.png";
import imgShape from "./75f186eae76bbafc67d4a5e12dfabda4c973c4b6.png";
import { imgRectangle } from "./svg-qs59d";

function Component1() {
  return (
    <div className="-translate-y-1/2 absolute h-[36px] left-0 overflow-clip top-1/2 w-[77px]" data-name="左侧-时间">
      <p className="absolute font-['Roboto:Medium',sans-serif] font-medium leading-[36px] left-[calc(50%-38.5px)] text-[30px] text-[rgba(255,255,255,0.8)] top-[calc(50%-18px)] whitespace-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
        10:12
      </p>
    </div>
  );
}

function R() {
  return (
    <div className="absolute inset-[24.07%_0.53%_22.22%_72.34%]" data-name="电池轮廓 R8黑">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 51 29">
        <g id="çµæ± è½®å» R8é»">
          <rect height="25.8" id="Rectangle" rx="4.8" stroke="var(--stroke-0, white)" strokeOpacity="0.8" strokeWidth="3.2" width="45.4094" x="1.6" y="1.6" />
          <path clipRule="evenodd" d={svgPaths.pe835b00} fill="var(--fill-0, white)" fillOpacity="0.8" fillRule="evenodd" id="Rectangle_2" />
        </g>
      </svg>
    </div>
  );
}

function Component4() {
  return (
    <div className="absolute contents inset-[24.07%_0.53%_22.22%_72.34%]" data-name="编组">
      <R />
      <div className="absolute bg-white inset-[34.52%_4.77%_32.66%_75.31%] opacity-90 rounded-[2.4px]" data-name="Rectangle" />
    </div>
  );
}

function Component3() {
  return (
    <div className="absolute contents inset-[0_0_0_71.81%]" data-name="电池">
      <Component4 />
      <div className="absolute bg-[#d8d8d8] inset-[0_0_0_71.81%] opacity-0" data-name="矩形" />
    </div>
  );
}

function Wifi() {
  return (
    <div className="absolute inset-[0_59.04%_0.74%_21.28%]" data-name="WIFI">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 37 53.6">
        <g id="WIFI">
          <path d={svgPaths.p266ccc00} fill="var(--fill-0, white)" id="å½¢ç¶ç»å" opacity="0.8" />
          <rect fill="var(--fill-0, #D8D8D8)" height="53.6" id="ç©å½¢" opacity="0.01" width="35.2" x="1" />
        </g>
      </svg>
    </div>
  );
}

function Component6() {
  return (
    <div className="absolute inset-[28.15%_3.16%_21.48%_2.11%]" data-name="信号">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36 27.2">
        <g id="ä¿¡å·">
          <path clipRule="evenodd" d={svgPaths.p227e9000} fill="var(--fill-0, white)" fillRule="evenodd" id="Rectangle" opacity="0.8" />
          <rect fill="var(--fill-0, white)" height="20.8" id="Rectangle_2" opacity="0.8" rx="1.2" width="4" x="24" y="6.4" />
          <rect fill="var(--fill-0, white)" height="16" id="Rectangle_3" opacity="0.8" rx="1.2" width="4" x="16" y="11.2" />
          <rect fill="var(--fill-0, white)" height="12" id="Rectangle_4" opacity="0.8" rx="1.2" width="4" x="8" y="15.2" />
          <rect fill="var(--fill-0, white)" height="8" id="Rectangle_5" opacity="0.8" rx="1.2" width="4" y="19.2" />
        </g>
      </svg>
    </div>
  );
}

function StatSysSignal5FullyNotchDark() {
  return (
    <div className="absolute contents inset-[0_1.05%_0.74%_0]" data-name="stat_sys_signal_5_fully_notch_dark">
      <Component6 />
      <div className="absolute bg-[#d8d8d8] inset-[0_1.05%_0.74%_0] opacity-0" data-name="矩形" />
    </div>
  );
}

function Component5() {
  return (
    <div className="absolute inset-[0_33.51%_0_46.28%] overflow-clip" data-name="信号">
      <p className="absolute font-['Qihei_Lenovo:60S',sans-serif] leading-[normal] left-[calc(50%-18.2px)] not-italic opacity-80 text-[13.6px] text-white top-[calc(50%-19.8px)] whitespace-nowrap">5G</p>
      <StatSysSignal5FullyNotchDark />
    </div>
  );
}

function Component2() {
  return (
    <div className="-translate-y-1/2 absolute h-[54px] overflow-clip right-0 top-1/2 w-[188px]" data-name="右侧-电池">
      <Component3 />
      <div className="-translate-x-full absolute font-['Roboto:Bold',sans-serif] font-bold leading-[0] left-[calc(50%-63px)] opacity-80 text-[18px] text-right text-white top-[calc(50%-18px)] whitespace-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
        <p className="leading-[18px] mb-0">420</p>
        <p className="leading-[18px]">k/s</p>
      </div>
      <Wifi />
      <Component5 />
    </div>
  );
}

function Pad5G() {
  return (
    <div className="absolute inset-[12.5%_1.88%] overflow-clip" data-name="Pad桌面-白状态栏5G-横屏效果图">
      <Component1 />
      <Component2 />
    </div>
  );
}

function Component8() {
  return (
    <div className="content-stretch flex items-center justify-center relative rounded-[2000px] shrink-0 size-[80px]" data-name="1">
      <div className="relative shrink-0 size-[56px]" data-name="Back & arrow_left 上一步 箭头向左">
        <div className="absolute inset-[0_-0.35%_0_0.35%]" data-name="Bounding box" />
        <div className="absolute inset-[9.55%_8.33%_12.5%_9.03%]" data-name="shape">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 46.2801 43.6499">
            <path clipRule="evenodd" d={svgPaths.p1a4fc500} fill="var(--fill-0, #191919)" fillRule="evenodd" id="shape" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Component7() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[96px]" data-name="2">
      <Component8 />
    </div>
  );
}

function Component10() {
  return (
    <div className="content-stretch flex items-center justify-center relative rounded-[2000px] shrink-0 size-[80px]" data-name="1">
      <div className="relative shrink-0 size-[56px]" data-name="Next & arrow_right 下一步 箭头向右">
        <div className="absolute inset-[-1.47%_0_1.47%_0]" data-name="Bounding box" />
        <div className="absolute flex inset-[9.55%_9.03%_12.5%_8.33%] items-center justify-center" style={{ containerType: "size" }}>
          <div className="-scale-x-100 flex-none h-[100cqh] w-[100cqw]">
            <div className="relative size-full" data-name="shape">
              <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 46.2801 43.6499">
                <path clipRule="evenodd" d={svgPaths.p1a4fc500} fill="var(--fill-0, #191919)" fillRule="evenodd" id="shape" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Component9() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[96px]" data-name="2">
      <Component10 />
    </div>
  );
}

function Group2() {
  return (
    <div className="col-1 grid-cols-[max-content] grid-rows-[max-content] inline-grid ml-[32px] mt-[32px] place-items-start relative row-1">
      <div className="col-1 ml-0 mt-0 relative row-1 size-[64px]" data-name="Bounding box" />
      <div className="col-1 h-[4.801px] ml-[18.4px] mt-[107.73px] relative row-1 w-[46.801px]" data-name="line">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 46.8008 4.80078">
          <path d={svgPaths.p1db75000} fill="var(--fill-0, #EE0004)" id="line" />
        </svg>
      </div>
    </div>
  );
}

function Group1() {
  return (
    <div className="col-1 grid-cols-[max-content] grid-rows-[max-content] inline-grid ml-[32px] mt-[32px] place-items-start relative row-1">
      <div className="col-1 ml-0 mt-0 relative row-1 size-[64px]" data-name="Bounding box" />
      <div className="col-1 h-[53.261px] ml-[10.96px] mt-[10.91px] relative row-1 w-[53.262px]" data-name="line">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 53.2628 53.2622">
          <path d={svgPaths.p788500} fill="var(--fill-0, #2371EE)" id="line" />
        </svg>
      </div>
    </div>
  );
}

function Group() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <div className="bg-[#d9d9d9] col-1 ml-0 mt-0 opacity-0 relative row-1 size-[96px]" />
      <Group2 />
      <Group1 />
    </div>
  );
}

function Component12() {
  return (
    <div className="content-stretch flex items-center justify-center relative rounded-[2000px] shrink-0 size-[80px]" data-name="1">
      <div className="relative shrink-0 size-[56px]" data-name="Mark pen 马克笔">
        <div className="absolute inset-[8.45%_8.51%_8.3%_5.49%]" data-name="shape">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48.1577 46.6173">
            <path clipRule="evenodd" d={svgPaths.p39482700} fill="var(--fill-0, #191919)" fillRule="evenodd" id="shape" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Component11() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[96px]" data-name="2">
      <Component12 />
    </div>
  );
}

function Component14() {
  return (
    <div className="content-stretch flex items-center justify-center relative rounded-[2000px] shrink-0 size-[80px]" data-name="1">
      <div className="relative shrink-0 size-[56px]" data-name="Pencil 铅笔">
        <div className="absolute inset-[9.28%_8.92%_8.32%_8.61%]" data-name="shape">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 46.1789 46.143">
            <path clipRule="evenodd" d={svgPaths.p20194200} fill="var(--fill-0, #191919)" fillRule="evenodd" id="shape" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Component13() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[96px]" data-name="2">
      <Component14 />
    </div>
  );
}

function Component16() {
  return (
    <div className="content-stretch flex items-center justify-center relative rounded-[2000px] shrink-0 size-[80px]" data-name="1">
      <div className="relative shrink-0 size-[56px]" data-name="Pen 钢笔">
        <div className="absolute inset-[8.5%_8.58%_8.34%_8.48%]" data-name="shape">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 46.4458 46.5693">
            <path clipRule="evenodd" d={svgPaths.pf851f00} fill="var(--fill-0, #191919)" fillRule="evenodd" id="shape" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Component15() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[96px]" data-name="2">
      <Component16 />
    </div>
  );
}

function Component18() {
  return (
    <div className="content-stretch flex items-center justify-center relative rounded-[2000px] shrink-0 size-[80px]" data-name="1">
      <div className="relative shrink-0 size-[56px]" data-name="Pixel rubber 像素橡皮">
        <div className="absolute inset-[11.15%_7.99%_13.72%_8.03%]" data-name="shape">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 47.0268 42.0705">
            <path clipRule="evenodd" d={svgPaths.p23188400} fill="var(--fill-0, #191919)" fillRule="evenodd" id="shape" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Component17() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[96px]" data-name="2">
      <Component18 />
    </div>
  );
}

function Component20() {
  return (
    <div className="content-stretch flex items-center justify-center relative rounded-[2000px] shrink-0 size-[80px]" data-name="1">
      <div className="relative shrink-0 size-[56px]" data-name="Autoshape 自动图形">
        <div className="absolute inset-[8.33%]" data-name="shape">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 46.6667 46.6667">
            <path clipRule="evenodd" d={svgPaths.p320f7e80} fill="var(--fill-0, #191919)" fillRule="evenodd" id="shape" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Component19() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[96px]" data-name="2">
      <Component20 />
    </div>
  );
}

function Component22() {
  return (
    <div className="content-stretch flex items-center justify-center relative rounded-[2000px] shrink-0 size-[80px]" data-name="1">
      <div className="relative shrink-0 size-[56px]" data-name="Select loop 自由选择">
        <div className="absolute inset-[12.5%]" data-name="shape">
          <img alt="" className="absolute block inset-0 max-w-none size-full" height="42" src={imgShape} width="42" />
        </div>
      </div>
    </div>
  );
}

function Component21() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[96px]" data-name="2">
      <Component22 />
    </div>
  );
}

function PalletColorBlack() {
  return (
    <div className="absolute contents left-[48px] size-[48px] top-[48px]" data-name="Pallet/Color/Black">
      <div className="absolute flex items-center justify-center left-[48px] size-[48px] top-[48px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "0" } as React.CSSProperties}>
        <div className="flex-none rotate-90">
          <div className="mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[0px_0px] mask-size-[24px_24px] relative size-[48px]" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 48 48\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'1\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(0 2.4 -2.4 0 24 24)\\'><stop stop-color=\\'rgba(255,255,255,0.80201)\\' offset=\\'0\\'/><stop stop-color=\\'rgba(245,245,245,0.0001)\\' offset=\\'1\\'/></radialGradient></defs></svg>'), url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 48 48\\' preserveAspectRatio=\\'none\\'><g transform=\\'matrix(2.4 0 0 2.4 24 24)\\'><foreignObject x=\\'-190\\' y=\\'-190\\' width=\\'380\\' height=\\'380\\'><div xmlns=\\'http://www.w3.org/1999/xhtml\\' style=\\'background-image: conic-gradient(from 90deg, rgb(232, 67, 61) 0%, rgb(200, 68, 104) 6.25%, rgb(167, 69, 147) 12.5%, rgb(135, 69, 189) 18.75%, rgb(102, 70, 232) 25%, rgb(98, 97, 191) 31.124%, rgb(94, 124, 150) 37.249%, rgb(90, 151, 109) 43.373%, rgb(86, 177, 68) 49.497%, rgb(144, 187, 68) 62.49%, rgb(203, 197, 68) 75.482%, rgb(218, 132, 64) 87.741%, rgb(225, 99, 63) 93.87%, rgb(232, 67, 61) 100%); opacity:1; height: 100%; width: 100%;\\'></div></foreignObject></g></svg>')", maskImage: `url('${imgRectangle}')` }} data-name="Rectangle" />
        </div>
      </div>
    </div>
  );
}

function PalletButtonBottomLeft() {
  return (
    <div className="absolute contents left-[48px] size-[48px] top-[48px]" data-name="Pallet Button Bottom Left">
      <div className="absolute flex items-center justify-center left-[48px] size-[48px] top-[48px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "19" } as React.CSSProperties}>
        <div className="flex-none rotate-90">
          <div className="relative size-[48px]" data-name="Oval">
            <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 48">
              <circle cx="24" cy="24" fill="var(--fill-0, #D8D8D8)" id="Oval" r="24" />
            </svg>
          </div>
        </div>
      </div>
      <PalletColorBlack />
    </div>
  );
}

function Group3() {
  return (
    <div className="absolute contents left-[48px] top-[48px]">
      <PalletButtonBottomLeft />
      <div className="absolute left-[60px] size-[36px] top-[60px]" data-name="椭圆形">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36 36">
          <circle cx="18" cy="18" fill="var(--fill-0, #FF4015)" id="æ¤­åå½¢" r="16.5" stroke="var(--stroke-0, white)" strokeWidth="3" />
        </svg>
      </div>
    </div>
  );
}

function Group4() {
  return (
    <div className="absolute contents left-[20px] top-[20px]">
      <div className="absolute left-[40px] size-[56px] top-[40px]" data-name="Bounding box" />
      <Group3 />
    </div>
  );
}

function Component24() {
  return (
    <div className="content-stretch flex items-center justify-center relative rounded-[2000px] shrink-0 size-[80px]" data-name="1">
      <div className="relative shrink-0 size-[56px]" data-name="透明度 蒙版">
        <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[42px] top-[calc(50%+0.65px)]" data-name="line">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 35.9999 35.9999">
            <path d={svgPaths.p7528700} fill="var(--fill-0, #191919)" id="line" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Component23() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[96px]" data-name="2">
      <Component24 />
    </div>
  );
}

function Component26() {
  return (
    <div className="content-stretch flex items-center justify-center relative rounded-[2000px] shrink-0 size-[80px]" data-name="1">
      <div className="relative shrink-0 size-[56px]" data-name="Crop & Screenshot 裁切 截图 截屏">
        <div className="absolute inset-[18.75%_4.17%_4.17%_18.75%]" data-name="shape">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 43.1667 43.1667">
            <path clipRule="evenodd" d={svgPaths.p28ee4e00} fill="var(--fill-0, #191919)" fillRule="evenodd" id="shape" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Component25() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[96px]" data-name="2">
      <Component26 />
    </div>
  );
}

function Component28() {
  return (
    <div className="content-stretch flex items-center justify-center relative rounded-[2000px] shrink-0 size-[80px]" data-name="1">
      <div className="relative shrink-0 size-[56px]" data-name="More_vert 更多">
        <div className="absolute inset-[14.58%_42.71%]" data-name="shape">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.16667 39.6667">
            <path clipRule="evenodd" d={svgPaths.p7b07680} fill="var(--fill-0, #191919)" fillRule="evenodd" id="shape" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Component27() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[96px]" data-name="2">
      <Component28 />
    </div>
  );
}

function Component30() {
  return (
    <div className="content-stretch flex items-center justify-center relative rounded-[2000px] shrink-0 size-[80px]" data-name="1">
      <div className="relative shrink-0 size-[56px]" data-name="Close & Mistake & Cross 关闭 错误 错号大">
        <div className="absolute inset-[13.72%]" data-name="shape">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 40.6332 40.6332">
            <path clipRule="evenodd" d={svgPaths.p28962500} fill="var(--fill-0, #191919)" fillRule="evenodd" id="shape" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Component29() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[96px]" data-name="2">
      <Component30 />
    </div>
  );
}

function Frame3() {
  return (
    <div className="max-w-[800px] relative shrink-0 w-full">
      <div className="flex flex-col justify-center max-w-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[16px] items-start justify-center max-w-[inherit] px-[64px] relative size-full">
          <p className="font-['Qihei_Lenovo:60S',sans-serif] leading-[96px] max-h-[96px] max-w-[672px] not-italic overflow-hidden relative shrink-0 text-[#191919] text-[72px] text-ellipsis whitespace-nowrap">画布不透明度</p>
        </div>
      </div>
    </div>
  );
}

function Frame() {
  return (
    <div className="h-[24px] relative shrink-0 w-full">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 160 24">
        <g id="Frame 26">
          <path clipRule="evenodd" d={svgPaths.p8e47b00} fill="var(--fill-0, #D8D8D8)" fillRule="evenodd" id="ç©å½¢" />
        </g>
      </svg>
    </div>
  );
}

function Frame1() {
  return (
    <div className="absolute h-[24px] left-[8px] right-[8px] top-[20px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 160 24">
        <g id="Frame 39">
          <path clipRule="evenodd" d={svgPaths.p3367c60} fill="var(--fill-0, #2371EE)" fillRule="evenodd" id="ç©å½¢" />
          <path clipRule="evenodd" d="M40 0H80V24H40V0Z" fill="var(--fill-0, #2371EE)" fillRule="evenodd" id="ç©å½¢_2" />
          <path clipRule="evenodd" d="M80 0H120V24H80V0Z" fill="var(--fill-0, #2371EE)" fillRule="evenodd" id="ç©å½¢_3" opacity="0" />
          <path clipRule="evenodd" d={svgPaths.p2f5da300} fill="var(--fill-0, #2371EE)" fillRule="evenodd" id="ç©å½¢_4" opacity="0" />
        </g>
      </svg>
    </div>
  );
}

function Frame2() {
  return (
    <div className="-translate-y-1/2 absolute content-stretch flex items-center justify-between left-[8px] right-[8px] top-1/2">
      <div className="bg-[rgba(255,255,255,0)] relative rounded-[16.5px] shrink-0 size-[56px]" data-name="矩形" />
      <div className="bg-[rgba(255,255,255,0)] relative rounded-[16.5px] shrink-0 size-[56px]" data-name="矩形" />
      <div className="bg-white relative rounded-[16.5px] shadow-[0px_0px_6px_0px_rgba(60,60,60,0.3)] shrink-0 size-[56px]" data-name="矩形" />
      <div className="bg-[rgba(255,255,255,0)] relative rounded-[16.5px] shrink-0 size-[56px]" data-name="矩形" />
      <div className="bg-[rgba(255,255,255,0)] relative rounded-[16.5px] shrink-0 size-[56px]" data-name="矩形" />
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 w-full">
      <div className="relative shrink-0 w-full" data-name="Slider+icon">
        <div className="flex flex-row items-center justify-center size-full">
          <div className="content-stretch flex items-center justify-center px-[48px] relative size-full">
            <div className="content-stretch flex items-center justify-center relative rounded-[2000px] shrink-0 size-[64px]" data-name="icon_list">
              <div className="relative shrink-0 size-[56px]" data-name="透明度 蒙版3">
                <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[42px] top-1/2" data-name="Union">
                  <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36 36">
                    <path d={svgPaths.p3fa5880} fill="var(--fill-0, #191919)" id="Union" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex flex-[1_0_0] flex-row items-center self-stretch">
              <div className="flex-[1_0_0] h-full min-w-px relative" data-name="Slider">
                <div className="flex flex-col items-center justify-center size-full">
                  <div className="content-stretch flex flex-col items-center justify-center px-[8px] py-[16px] relative size-full">
                    <Frame />
                    <Frame1 />
                    <Frame2 />
                  </div>
                </div>
              </div>
            </div>
            <div className="content-stretch flex items-center justify-center relative rounded-[2000px] shrink-0 size-[64px]" data-name="icon_list">
              <div className="relative shrink-0 size-[56px]" data-name="透明度 蒙版2">
                <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[42px] top-1/2" data-name="Union">
                  <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36 36">
                    <path d={svgPaths.p10b16680} fill="var(--fill-0, #191919)" id="Union" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame4() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[16px] items-start py-[32px] relative rounded-[40px] shrink-0 w-full">
      <Frame3 />
      <Frame7 />
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0">
      <div className="relative shrink-0 size-[40px]" data-name="记忆">
        <div className="absolute flex items-center justify-center left-[3.5px] size-[32.998px] top-[3.5px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "19" } as React.CSSProperties}>
          <div className="flex-none rotate-45">
            <div className="relative size-[23.333px]">
              <div className="absolute inset-[-4.26%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 25.3235 25.3235">
                  <path d={svgPaths.p28e19a40} id="Rectangle 3" stroke="url(#paint0_radial_4_538)" strokeWidth="3.75" />
                  <defs>
                    <radialGradient cx="0" cy="0" gradientTransform="translate(28.8849 2.15998) rotate(126.197) scale(27.4705 27.4705)" gradientUnits="userSpaceOnUse" id="paint0_radial_4_538" r="1">
                      <stop stopColor="#EC6392" />
                      <stop offset="0.331731" stopColor="#FA6E68" />
                      <stop offset="0.682692" stopColor="#CB6CDA" />
                      <stop offset="0.971154" stopColor="#618AFF" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="font-['PingFang_SC:Medium',sans-serif] leading-[normal] not-italic relative shrink-0 text-[28px] text-white tracking-[0.28px] whitespace-nowrap">已同步至AI记忆</p>
    </div>
  );
}

function Frame5() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0.9)] content-stretch drop-shadow-[0px_6px_15px_rgba(0,0,0,0.05),0px_16px_12px_rgba(0,0,0,0.04),0px_8px_5px_rgba(0,0,0,0.08)] flex gap-[40px] items-center justify-center left-[167px] px-[40px] py-[24px] rounded-[60px] top-[1013px]">
      <div aria-hidden="true" className="absolute border border-[#c3c3c3] border-solid inset-0 pointer-events-none rounded-[60px]" />
      <Frame6 />
      <p className="font-['PingFang_SC:Medium',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#6b7fff] text-[28px] tracking-[0.28px] whitespace-nowrap">查看</p>
    </div>
  );
}

export default function Component() {
  return (
    <div className="bg-[#f7f7f7] relative size-full" data-name="批注模式 保存">
      <div className="absolute h-[1600px] left-0 top-0 w-[2561px]" data-name="VCG211320995760">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="1600" src={imgVcg211320995760} width="2561" />
      </div>
      <div className="absolute h-[1601.73px] left-0 top-[-1px] w-[2560px]" data-name="image 2">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage2} />
      </div>
      <div className="absolute h-[72px] left-0 top-0 w-[2560px]" data-name="Bars/状态栏/横屏/浅色">
        <Pad5G />
      </div>
      <div className="-translate-x-1/2 absolute content-stretch flex gap-[16px] h-[120px] items-center left-1/2 px-[48px] top-[100px]" data-name="Panel">
        <div className="absolute bg-white inset-0 rounded-[30px]" data-name="矩形">
          <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-[-0.5px] pointer-events-none rounded-[30.5px] shadow-[0px_5px_12px_0px_rgba(0,0,0,0.1)]" />
        </div>
        <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Pencil 铅笔">
          <Component7 />
        </div>
        <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Pencil 铅笔">
          <Component9 />
        </div>
        <div className="h-[60px] relative shrink-0 w-[2px]" data-name="Divider">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2 60">
            <path clipRule="evenodd" d="M0 0H2V60H0V0Z" fill="var(--fill-0, #E9E9E9)" fillRule="evenodd" id="ç©å½¢" />
          </svg>
        </div>
        <Group />
        <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Mark pen 马克笔">
          <Component11 />
        </div>
        <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Pencil 铅笔">
          <Component13 />
        </div>
        <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Pen 钢笔">
          <Component15 />
        </div>
        <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Pixel rubber 像素橡皮">
          <Component17 />
        </div>
        <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Autoshape 自动图形">
          <Component19 />
        </div>
        <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Select loop 自由选择">
          <Component21 />
        </div>
        <div className="relative shrink-0 size-[96px]" data-name="色盘">
          <Group4 />
        </div>
        <div className="h-[60px] relative shrink-0 w-[2px]" data-name="Divider">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2 60">
            <path clipRule="evenodd" d="M0 0H2V60H0V0Z" fill="var(--fill-0, #E9E9E9)" fillRule="evenodd" id="ç©å½¢" />
          </svg>
        </div>
        <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Finger painting off & gesture & hand 手指涂画 关 手势">
          <Component23 />
        </div>
        <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Finger painting off & gesture & hand 手指涂画 关 手势">
          <Component25 />
        </div>
      </div>
      <div className="-translate-x-1/2 absolute content-stretch flex gap-[16px] h-[120px] items-center left-[calc(50%+1064px)] px-[48px] top-[100px]" data-name="Panel">
        <div className="absolute bg-white inset-0 rounded-[30px]" data-name="矩形">
          <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-[-0.5px] pointer-events-none rounded-[30.5px] shadow-[0px_5px_12px_0px_rgba(0,0,0,0.1)]" />
        </div>
        <p className="font-['Qihei_Lenovo:60S',sans-serif] leading-[64px] not-italic relative shrink-0 text-[#333] text-[48px] whitespace-nowrap">保存</p>
        <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Finger painting off & gesture & hand 手指涂画 关 手势">
          <Component27 />
        </div>
      </div>
      <div className="-translate-x-1/2 absolute content-stretch flex gap-[16px] h-[120px] items-center left-[calc(50%-1097px)] px-[48px] top-[100px]" data-name="Panel">
        <div className="absolute bg-white inset-0 rounded-[30px]" data-name="矩形">
          <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-[-0.5px] pointer-events-none rounded-[30.5px] shadow-[0px_5px_12px_0px_rgba(0,0,0,0.1)]" />
        </div>
        <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Pencil 铅笔">
          <Component29 />
        </div>
      </div>
      <div className="absolute content-stretch drop-shadow-[0px_4px_2.5px_rgba(0,0,0,0.3)] flex flex-col items-center left-[1384px] top-[248px] w-[400px]" data-name="Rich tooltips">
        <Frame4 />
      </div>
      <div className="absolute h-[374px] left-[80px] pointer-events-none rounded-[24px] top-[1146px] w-[598px]" data-name="image 3">
        <img alt="" className="absolute inset-0 max-w-none object-cover rounded-[24px] size-full" src={imgImage2} />
        <div aria-hidden="true" className="absolute border-6 border-[rgba(255,255,255,0.4)] border-solid inset-[-6px] rounded-[30px] shadow-[0px_6px_30px_5px_rgba(0,0,0,0.05),0px_16px_24px_2px_rgba(0,0,0,0.04),0px_8px_10px_-5px_rgba(0,0,0,0.08)]" />
      </div>
      <Frame5 />
    </div>
  );
}