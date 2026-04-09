import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";
import { z } from "zod";

function getWeekday(): string {
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return weekdays[new Date().getDay()];
}

export function registerWeather(server: McpServer) {
  server.tool(
  "get_weather",
  "获取今天是星期几以及指定城市的天气",
  { city: z.string().describe("城市名，英文，如 Shanghai") },
  async ({ city }) => {
    const res = await axios.get(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`
    );
    const current = res.data.current_condition[0];
    const temp = current.tempC;
    const feelsLike = current.FeelsLikeC;
    const desc = current.lang_zh?.[0]?.value || current.weatherDesc?.[0]?.value;
    const weekday = getWeekday();

    return {
      content: [
        {
          type: "text",
          text: `今天是${weekday}，${city}天气：${desc}，温度 ${temp}°C，体感 ${feelsLike}°C`,
        },
      ],
    };
  }
);
}
