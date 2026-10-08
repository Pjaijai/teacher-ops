/**
 * 繁簡混用 check (code only, no AI). HKEAA accepts traditional, simplified and mixed scripts, so this
 * is feedback only (see rubrics/chinese-writing.md §2.4): the class rule is "write in one script".
 *
 * The table lists characters whose simplified form differs from the traditional one AND where the
 * simplified form is not itself an ordinary traditional character. Ambiguous pairs (后/後, 干/乾,
 * 里/裏, 面/麵, 只/隻, 台/臺, 系/係, 才/纔, 余/餘, 云/雲, 着/著, 冲/沖, 于/於 …) are left out so we
 * never flag a correct traditional character. Each entry is "<simplified><traditional…>"; several
 * traditional characters mean a one-to-many mapping (发 → 發／髮).
 */
const PAIRS = `
这這 们們 个個 来來 时時 为為 说說 国國 学學 会會 对對 过過 还還 没沒 发發髮 经經 动動 现現 实實 么麼 当當噹
无無 开開 见見 头頭 从從 两兩 长長 样樣 将將 与與 进進 点點 种種 声聲 话話 儿兒 问問 机機 给給 业業 间間 电電
门門 东東 听聽 气氣 关關 却卻 军軍 产產 万萬 体體 别別 处處 总總 场場 师師 书書 员員 华華 报報 马馬 张張 难難
数數 车車 应應 亲親 务務 记記 边邊 风風 战戰 许許 觉覺 题題 统統 请請 爱愛 让讓 认認 论論 义義 术術 结結 连連
远遠 资資 队隊 带帶 条條 变變 联聯 权權 该該 领領 传傳 红紅 决決 达達 办辦 运運 区區 转轉 众眾 轻輕 语語 满滿
写寫 识識 极極 黄黃 脸臉 钱錢 设設 双雙 历歷曆 议議 际際 则則 单單 导導 网網 专專 谁誰 读讀 飞飛 观觀 争爭 组組
视視 济濟 离離 虽雖 编編 宝寶 谈談 随隨 尽盡儘 剑劍 讲講 杀殺 调調 团團 终終 乐樂 级級 质質 热熱 习習 买買 卖賣
饭飯 钟鐘鍾 闻聞 欢歡 乡鄉 庄莊 灯燈 岁歲 医醫 药藥 鸡雞 鸟鳥 鱼魚 龙龍 龟龜 爷爺 妈媽 吗嗎 讨討 试試 课課 词詞
诗詩 讯訊 订訂 谢謝 错錯 铁鐵 银銀 镜鏡 钢鋼 针針 锁鎖 页頁 顺順 须須鬚 顾顧 预預 颜顏 额額 类類 飘飄 饮飲 饿餓
馆館 驾駕 验驗 骑騎 骗騙 鲜鮮 鸣鳴 齐齊 齿齒 闭閉 闲閒閑 闹鬧 阅閱 阳陽 阴陰 阵陣 陆陸 险險 隐隱 杂雜 雾霧 静靜
韩韓 农農 汉漢 汤湯 沟溝 浅淺 测測 浓濃 涛濤 润潤 涨漲 渐漸 湾灣 滚滾 灵靈 灭滅 灿燦 烂爛 烟煙 烦煩 烧燒
牵牽 犹猶 狱獄 独獨 猎獵 环環 画畫 畅暢 疗療 皱皺 盖蓋 盘盤 监監 码碼 础礎 确確 礼禮 祸禍 积積 称稱 稳穩 穷窮
窃竊 竞競 笔筆 笼籠 节節 简簡 签簽 篮籃 粮糧 紧緊 纪紀 约約 纯純 纸紙 纷紛 线線 练練 细細 织織 绍紹 绕繞 绘繪
络絡 绝絕 继繼 绩績 续續 维維 综綜 绿綠 缓緩 缘緣 缩縮 罗羅 罚罰 罢罷 职職 聪聰 肃肅 肤膚 胁脅 胜勝 脑腦 脏髒臟
 腾騰 舰艦 艺藝 苏蘇 苹蘋 荣榮 获獲穫 营營 萝蘿 蓝藍 虑慮 虚虛 虫蟲 虾蝦 蚁蟻 蛮蠻 补補 装裝 袭襲 规規 览覽
触觸 誉譽 训訓 访訪 证證 评評 诉訴 译譯 诚誠 询詢 详詳 误誤 诸諸 谊誼 谋謀 谓謂 谜謎 谦謙 谨謹 贝貝 负負 贡貢
财財 责責 贤賢 败敗 货貨 贩販 贪貪 贫貧 购購 贯貫 贴貼 贵貴 贷貸 费費 贺賀 赏賞 赔賠 赖賴 赚賺 赛賽 赞贊讚 赠贈
赶趕 赵趙 趋趨 跃躍 践踐 轨軌 轮輪 软軟 载載 较較 辅輔 辆輛 辈輩 辉輝 输輸 辞辭 迁遷 迈邁 违違 迟遲 适適 选選
递遞 逻邏 遗遺 邮郵 邻鄰 郑鄭 释釋 鉴鑑 钥鑰 铃鈴 铜銅 链鏈 销銷 锅鍋 锋鋒 锦錦 键鍵 镇鎮 闪閃 闯闖 阶階 陈陳
项項 顶頂 频頻 颗顆 饰飾 饱飽 饼餅 驱驅 驶駛 驻駐 骂罵 骄驕 骤驟 鲁魯 麦麥 龄齡 亏虧 亿億 仅僅 仓倉 仪儀 价價
优優 伟偉 伤傷 伦倫 伪偽 侣侶 侦偵 侧側 侨僑 俭儉 债債 倾傾 偿償 储儲 兰蘭 兴興 养養 兽獸 军軍 冯馮 况況 冻凍
净淨 凉涼 减減 凤鳳 凭憑 凯凱 击擊 刘劉 刚剛 创創 剧劇 劝勸 劳勞 势勢 协協 卫衛 厂廠 压壓 厅廳 县縣 参參
叠疊 号號 叹嘆 吓嚇 吕呂 启啟 呜嗚 响響 哗嘩 唤喚 喷噴 园園 围圍 图圖 圆圓 圣聖 坏壞 块塊 坚堅 坛壇 坟墳 尘塵
尝嘗 层層 属屬 岂豈 岛島 峡峽 币幣 帐帳 帮幫 广廣 庆慶 库庫 废廢 异異 弃棄 弯彎 弹彈 归歸 录錄 彻徹 径徑
忆憶 忧憂 怀懷 态態 怜憐 恋戀 恶惡 惊驚 惧懼 惯慣 愤憤 愿願 戏戲 执執 扩擴 扫掃 扬揚 扰擾 抢搶 护護 担擔 拟擬
拥擁 拦攔 择擇 挡擋 挤擠 挥揮 损損 捡撿 携攜 摄攝 摆擺 敌敵 断斷 旧舊 昼晝 显顯 晓曉 暂暫 杨楊 构構
枪槍 柜櫃 标標 栏欄 树樹 档檔 桥橋 梦夢 检檢 楼樓 欧歐 残殘 毕畢 汇匯彙 泪淚 泽澤 洁潔 渔漁 湿濕 灾災
炉爐 炼煉 烛燭 牺犧 状狀 狮獅 猪豬 献獻 疯瘋 盐鹽 矿礦 砖磚 碍礙 筑築 筹籌 纳納 纵縱 肠腸 肿腫 胆膽 艰艱 苍蒼
荐薦 荡蕩 莲蓮 裤褲 贸貿 赢贏 辩辯 邓鄧 闷悶 阁閣 顿頓 饥飢饑 鸭鴨 们們 乱亂 亚亞 伞傘 侠俠 举舉 丽麗 么麼
众眾 优優 纤纖 纲綱 绳繩 缺缺 舆輿 誊謄 讶訝 讽諷 诈詐 诞誕 诺諾 谅諒 谎謊 谣謠 谱譜 贞貞 账賬 贬貶 赋賦
赌賭 赐賜 轰轟 逊遜 酿釀 钓釣 钞鈔 钩鉤 铅鉛 铺鋪 锐銳 锡錫 锻鍛 闸閘 阀閥 陕陝 隶隸 霉黴 顽頑 颇頗 饲飼 驰馳
驳駁 骚騷 鸽鴿 恼惱 愁愁 宁寧 尔爾 归歸 虑慮 习習 乔喬 节節 蜡蠟 蝇蠅 衬襯 袜襪 粪糞 竖豎 窍竅 秃禿 礼禮 硕碩
灶竈 渊淵 滞滯 滥濫 浑渾 浊濁 洼窪 沪滬 毁毀 欤歟 樱櫻 桨槳 栋棟 柠檸 枣棗 术術 晕暈 晋晉 旷曠 无無
`;

const TO_TRAD = new Map<string, string>();
const TO_SIMP = new Map<string, string>();
for (const pair of PAIRS.split(/\s+/).filter(Boolean)) {
  const chars = [...pair];
  const simp = chars[0];
  const trads = chars.slice(1).filter((t) => t !== simp);
  if (trads.length === 0) continue;
  TO_TRAD.set(simp, trads.join("／"));
  for (const t of trads) if (!TO_SIMP.has(t)) TO_SIMP.set(t, simp);
}

export type Script = "trad" | "simp";

export type ScriptCheck = {
  dominant: Script | null;
  tradCount: number;
  simpCount: number;
  /** minority-script characters, with the form in the dominant script */
  flags: { index: number; char: string; suggestion: string }[];
};

/**
 * Count characters that only exist in one script; the majority is the dominant script and every
 * character in the other script is flagged. Ties and texts without script-specific characters give
 * no flags.
 */
export function checkScript(text: string): ScriptCheck {
  const simp: number[] = [];
  const trad: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (TO_TRAD.has(ch)) simp.push(i);
    else if (TO_SIMP.has(ch)) trad.push(i);
  }
  if (simp.length === trad.length) return { dominant: null, tradCount: trad.length, simpCount: simp.length, flags: [] };
  const dominant: Script = trad.length > simp.length ? "trad" : "simp";
  const minority = dominant === "trad" ? simp : trad;
  const map = dominant === "trad" ? TO_TRAD : TO_SIMP;
  return {
    dominant,
    tradCount: trad.length,
    simpCount: simp.length,
    flags: minority.map((index) => ({ index, char: text[index], suggestion: map.get(text[index])! })),
  };
}
