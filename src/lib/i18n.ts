export type Lang = "en" | "zh";

export type Copy = {
  brand: string;
  title: string;
  lede: string;
  original: string;
  yourPortrait: string;
  noPhoto: string;
  addPortrait: string;
  addHint: string;
  targetAge: string;
  aboutAge: string;
  shiftTo: string;
  altShifted: string;
  instructions: string;
  placeholder: string;
  shifting: string;
  already: string;
  replace: string;
  waiting: string;
  detailShifting: string;
  moving: string;
  lands: string;
  busyHint: string;
  idleHint: string;
  download: string;
  kept: string;
  disclaimer: string;
  langLabel: string;
  altOriginal: string;
  errType: string;
  errSize: string;
  errRead: string;
  errFinish: string;
  errReadPhoto: string;
  errUnavailable: string;
  errRate: string;
  errEmpty: string;
  errBlocked: string;
  errReject: string;
};

export const copy: Record<Lang, Copy> = {
  en: {
    brand: "Ageglass",
    title: "Same person. Different years.",
    lede: "Add a portrait, choose an age, and add a note if you want something more specific.",
    original: "Original",
    yourPortrait: "Your portrait",
    noPhoto: "No photo yet",
    addPortrait: "Add a portrait",
    addHint: "A clear face, facing the camera, works best. JPEG, PNG, or WebP.",
    targetAge: "Target age",
    aboutAge: "About age {age}",
    shiftTo: "Shift to age {age}",
    altShifted: "Portrait shifted to about age {age}",
    instructions: "Further instructions",
    placeholder: "Optional. A smile, outdoor light, keep the glasses.",
    shifting: "Shifting…",
    already: "Already shifted",
    replace: "Replace",
    waiting: "Waiting",
    detailShifting: "Shifting",
    moving: "Moving the years",
    lands: "The shift lands here",
    busyHint: "This usually takes a short while. Keep this tab open.",
    idleHint: "Choose an age, then shift. The original stays put.",
    download: "Download",
    kept: "Change the age or the note and shift again. A matching result stays until you replace the photo.",
    disclaimer:
      "Use only photos you have the right to edit. Each shift is an approximate, fully clothed portrait — not a medical prediction — and spends image credits.",
    langLabel: "Language",
    altOriginal: "Original portrait",
    errType: "Use a JPEG, PNG, or WebP portrait.",
    errSize: "That file is too large. Try a smaller photo.",
    errRead: "Could not read that image.",
    errFinish: "The shift didn't finish. Try again in a moment.",
    errReadPhoto: "That photo couldn't be read. Use a JPEG portrait and try again.",
    errUnavailable: "Image shifting isn't available in this environment.",
    errRate: "Too many shifts in a short time. Wait a minute and try again.",
    errEmpty: "The shift didn't return an image. Try again.",
    errBlocked: "That instruction can't be used. Keep the portrait fully clothed and non-sexual.",
    errReject: "This portrait couldn't be shifted.",
  },
  zh: {
    brand: "Ageglass",
    title: "同一张脸，不同的年纪。",
    lede: "上传一张肖像，选择年龄，也可以写下更具体的要求。",
    original: "原图",
    yourPortrait: "你的肖像",
    noPhoto: "还没有照片",
    addPortrait: "添加肖像",
    addHint: "正脸、光线清楚的照片效果最好。支持 JPEG、PNG、WebP。",
    targetAge: "目标年龄",
    aboutAge: "大约{age}岁",
    shiftTo: "变为{age}岁",
    altShifted: "变换为大约{age}岁的肖像",
    instructions: "补充说明",
    placeholder: "可选。比如微笑、户外光线、保留眼镜。",
    shifting: "变换中…",
    already: "已经变换",
    replace: "更换",
    waiting: "等待中",
    detailShifting: "变换中",
    moving: "岁月正在移动",
    lands: "结果会显示在这里",
    busyHint: "通常需要一点时间，请不要关闭这个页面。",
    idleHint: "选择年龄后再变换。原图会保留。",
    download: "下载",
    kept: "改年龄或说明后再变换。在更换照片之前，相同的结果会保留。",
    disclaimer: "请只使用你有权编辑的照片。每次变换都是大致的、衣着完整的肖像，不是医学预测，并且会消耗图像额度。",
    langLabel: "语言",
    altOriginal: "原始肖像",
    errType: "请使用 JPEG、PNG 或 WebP 肖像。",
    errSize: "文件太大，请换一张较小的照片。",
    errRead: "无法读取这张图片。",
    errFinish: "变换没有完成，请稍后再试。",
    errReadPhoto: "无法读取这张照片。请使用 JPEG 肖像后再试。",
    errUnavailable: "当前环境无法使用图像变换。",
    errRate: "短时间内变换次数过多，请稍等一分钟再试。",
    errEmpty: "变换没有返回图片，请再试一次。",
    errBlocked: "这条说明无法使用。请保持肖像衣着完整、非性化。",
    errReject: "这张肖像无法变换。",
  },
};

export function withAge(template: string, age: number): string {
  return template.replaceAll("{age}", String(age));
}

export function explainShift(code: string, detail: string | undefined, t: Copy): string {
  if (code === "read") return t.errReadPhoto;
  if (code === "unavailable") return t.errUnavailable;
  if (code === "rate") return t.errRate;
  if (code === "empty") return t.errEmpty;
  if (code === "blocked") return t.errBlocked;
  if (code === "reject") return detail ? `${t.errReject} ${detail}` : t.errReject;
  return t.errFinish;
}
