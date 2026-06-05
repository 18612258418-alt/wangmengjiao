import imgOvalStroke from "./512fef88321a610493c15a0437a09b73d372414e.png";

function Frame() {
  return (
    <div className="content-stretch flex gap-[8px] h-[36px] items-center relative shrink-0 w-full">
      <div className="relative shrink-0 size-[32px]" data-name="loading-blue">
        <div className="absolute inset-[9.38%]" data-name="Oval (Stroke)">
          <img alt="" className="absolute block inset-0 max-w-none size-full" height="26" src={imgOvalStroke} width="26" />
        </div>
      </div>
      <p className="font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[30px] text-black whitespace-nowrap">批注AI分析中...</p>
    </div>
  );
}

export default function Frame1() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start px-[48px] py-[24px] relative rounded-[48px] size-full">
      <Frame />
    </div>
  );
}