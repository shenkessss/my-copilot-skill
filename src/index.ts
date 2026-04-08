import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(express.json());

// 获取天气的函数（使用 wttr.in，免费无需 Key）
async function getWeather(city: string): Promise<string> {
  const res = await axios.get(
    `https://wttr.in/${encodeURIComponent(city)}?format=j1`
  );
  const current = res.data.current_condition[0];
  const temp = current.temp_C;
  const feelsLike = current.FeelsLikeC;
  const desc = current.lang_zh?.[0]?.value || current.weatherDesc?.[0]?.value;

  return `${desc}，温度 ${temp}°C，体感 ${feelsLike}°C`;
}

// 获取今天星期几的函数
function getWeekday(): string {
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return weekdays[new Date().getDay()];
}

app.get("/weather", async (req, res) => {
  try {
    const city = (req.query.city as string) || "Beijing";
    const weekday = getWeekday();
    const weather = await getWeather(city);

    res.json({
      message: `今天是${weekday}，当前天气：${weather}`
    });
  } catch (error: any) {
    console.error("报错详情：", error?.response?.data || error?.message || error);
    res.status(500).json({
      error: "获取天气失败",
      detail: error?.response?.data || error?.message
    });
  }
});

app.listen(3000, () => {
  console.log("服务器跑起来了：http://localhost:3000");
});