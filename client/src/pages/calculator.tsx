import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Gamepad2, Trophy, Zap, Moon, Info, AlertCircle } from "lucide-react";
import { 
  NORMAL_ZONE_TARIFFS, 
  isWeekend, 
  isTariffAvailable,
  findOptimalCombination,
  spansBothWeekdayAndWeekend,
  type Tariff 
} from "@shared/schema";

type Zone = "normal" | "vip" | "bootcamp" | "tv";

export default function Calculator() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hours, setHours] = useState<string>("");
  const [minutes, setMinutes] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<Zone>("normal");
  const [devMode, setDevMode] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [devTime, setDevTime] = useState<string>("");
  const [devDate, setDevDate] = useState<string>("");
  const [forceWeekend, setForceWeekend] = useState<boolean | null>(null);
  
  const effectiveTime = devMode && devTime && devDate 
    ? new Date(`${devDate}T${devTime}`)
    : currentTime;
  
  const isWeekendDay = forceWeekend !== null 
    ? forceWeekend 
    : isWeekend(effectiveTime);
  const currentHour = effectiveTime.getHours();
  
  const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
  
  const spansInfo = useMemo(() => 
    spansBothWeekdayAndWeekend(effectiveTime, totalMinutes),
    [effectiveTime, totalMinutes]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (logoClickCount >= 5) {
      setDevMode(true);
      const now = new Date();
      setDevDate(now.toISOString().split('T')[0]);
      setDevTime(now.toTimeString().slice(0, 5));
      setLogoClickCount(0);
    }
    const timer = setTimeout(() => setLogoClickCount(0), 2000);
    return () => clearTimeout(timer);
  }, [logoClickCount]);

  const handleLogoClick = () => {
    setLogoClickCount(prev => prev + 1);
  };

  const getTariffIcon = (tariffId: string) => {
    switch (tariffId) {
      case "cyber-hour":
        return <Clock className="w-5 h-5" />;
      case "triple-kill":
        return <Gamepad2 className="w-5 h-5" />;
      case "ultra-kill":
        return <Trophy className="w-5 h-5" />;
      case "cyber-night":
        return <Moon className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const optimalCombination = useMemo(() => 
    totalMinutes > 0 && totalMinutes <= 3600
      ? findOptimalCombination(totalMinutes, currentHour, isWeekendDay, effectiveTime)
      : null,
    [totalMinutes, currentHour, isWeekendDay, effectiveTime]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.svg" 
              alt="Logo" 
              className="w-20 h-20" 
              onClick={handleLogoClick}
              style={{ cursor: 'pointer' }}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Badge 
                variant={isWeekendDay ? "default" : "secondary"}
                className="font-medium"
                data-testid="badge-day-type"
              >
                {isWeekendDay ? "Выходные" : "Будни"}
              </Badge>
            </div>
            <div 
              className="flex items-center gap-2 font-mono text-lg font-semibold"
              data-testid="text-current-time"
            >
              <Clock className="w-4 h-4 text-primary" />
              {formatTime(effectiveTime)}
            </div>
          </div>
        </div>
      </header>

      {devMode && (
        <div className="bg-destructive/20 border-b border-destructive/40 sticky top-[73px] z-40">
          <div className="max-w-4xl mx-auto px-4 lg:px-8 py-3">
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="destructive" className="font-semibold">
                Режим разработчика
              </Badge>
              <div className="flex items-center gap-2">
                <label className="text-xs text-foreground">Дата:</label>
                <input
                  type="date"
                  value={devDate}
                  onChange={(e) => setDevDate(e.target.value)}
                  className="px-2 py-1 rounded text-xs bg-background border border-border"
                  data-testid="input-dev-date"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-foreground">Время:</label>
                <input
                  type="time"
                  value={devTime}
                  onChange={(e) => setDevTime(e.target.value)}
                  className="px-2 py-1 rounded text-xs bg-background border border-border"
                  data-testid="input-dev-time"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-foreground">Тип дня:</label>
                <select
                  value={forceWeekend === null ? "auto" : forceWeekend ? "weekend" : "weekday"}
                  onChange={(e) => {
                    if (e.target.value === "auto") setForceWeekend(null);
                    else setForceWeekend(e.target.value === "weekend");
                  }}
                  className="px-2 py-1 rounded text-xs bg-background border border-border"
                  data-testid="select-dev-day-type"
                >
                  <option value="auto">Авто</option>
                  <option value="weekday">Будни</option>
                  <option value="weekend">Выходные</option>
                </select>
              </div>
              <button
                onClick={() => {
                  setDevMode(false);
                  setForceWeekend(null);
                }}
                className="px-3 py-1 rounded text-xs bg-destructive text-destructive-foreground hover-elevate"
                data-testid="button-close-dev-mode"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-12">
        <div className="mb-4 lg:mb-6">
          <p className="text-sm text-muted-foreground" data-testid="text-current-date">
            {formatDate(effectiveTime)}
          </p>
        </div>

        <Card className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
          <div>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm text-muted-foreground">Выберите зону</p>
                <Badge variant="outline" className="text-xs">В разработке</Badge>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedZone("normal")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    selectedZone === "normal"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  Normal
                </button>
                <button
                  disabled
                  className="px-4 py-2 rounded-md text-sm font-medium bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                >
                  VIP
                </button>
                <button
                  disabled
                  className="px-4 py-2 rounded-md text-sm font-medium bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                >
                  Bootcamp
                </button>
                <button
                  disabled
                  className="px-4 py-2 rounded-md text-sm font-medium bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                >
                  TV
                </button>
              </div>
            </div>
            <h2 className="text-2xl font-semibold mb-2">
              Зона {selectedZone === "normal" ? "Normal" : selectedZone === "vip" ? "VIP" : selectedZone === "bootcamp" ? "Bootcamp" : "TV"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Укажите время и узнайте оптимальные варианты
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Часы
                </label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="0"
                  className="text-lg font-mono"
                  data-testid="input-hours"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Минуты
                </label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="0"
                  className="text-lg font-mono"
                  data-testid="input-minutes"
                />
              </div>
            </div>
            {totalMinutes > 3600 && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md border border-destructive/20">
                <Info className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-xs text-destructive">
                  Максимальное время для расчета: 60 часов (3600 минут)
                </p>
              </div>
            )}
          </div>

          {optimalCombination && (
            <div className="space-y-4">
              <div className="bg-accent/50 rounded-md p-4 sm:p-6 space-y-4 border border-primary/20 shadow-[0_0_20px_rgba(0,191,255,0.1)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Оптимальная стоимость
                    </p>
                    <p 
                      className="font-mono text-3xl lg:text-4xl font-bold text-primary drop-shadow-[0_0_12px_rgba(0,191,255,0.6)]"
                      data-testid="text-calculated-price"
                    >
                      {optimalCombination.totalPrice}₽
                    </p>
                  </div>
                  <Badge variant="outline" className="h-fit">
                    {totalMinutes < 60 
                      ? `${totalMinutes} мин` 
                      : `${Math.floor(totalMinutes / 60)}ч ${totalMinutes % 60 > 0 ? totalMinutes % 60 + 'м' : ''}`}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {optimalCombination.segments.map((segment, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-background/50 rounded-md border border-border/50"
                      data-testid={`segment-${index}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {segment.quantity > 1 ? `(${segment.quantity}x) ` : ''}
                          {segment.tariff.nameRu}
                          {segment.quantity === 1 && !segment.tariff.perMinute ? ` - ${segment.label}` : ''}
                          {segment.tariff.perMinute ? ` - ${segment.label}` : ''}
                        </p>
                      </div>
                      <p className="font-mono font-semibold text-lg ml-4">
                        {segment.price}₽
                      </p>
                    </div>
                  ))}
                </div>

                {optimalCombination.wastedMinutes > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-md">
                    <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Включает {optimalCombination.wastedMinutes} мин сверх запрошенного времени
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            {NORMAL_ZONE_TARIFFS.map((tariff) => {
              const isAvailable = isTariffAvailable(tariff, currentHour);
              const weekdayPrice = tariff.priceWeekday;
              const weekendPrice = tariff.priceWeekend;

              return (
                <Card
                  key={tariff.id}
                  className={`p-4 sm:p-6 transition-all hover-elevate ${
                    !isAvailable ? "opacity-50" : ""
                  }`}
                  data-testid={`card-tariff-${tariff.id}`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md flex items-center justify-center bg-accent text-accent-foreground">
                          {getTariffIcon(tariff.id)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{tariff.nameRu}</h3>
                          <p className="text-sm text-muted-foreground">
                            {tariff.perMinute
                              ? tariff.description
                              : `${Math.floor(tariff.duration / 60)}ч`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {tariff.description && !tariff.perMinute && (
                      <p className="text-xs text-muted-foreground">
                        {tariff.description}
                      </p>
                    )}

                    {!isAvailable && (
                      <Badge variant="destructive" className="text-xs">
                        Доступно с {tariff.availableFrom}:00 до {tariff.availableTo}:00
                      </Badge>
                    )}

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Будни</p>
                        <p className={`font-mono text-xl font-semibold transition-all ${
                          totalMinutes > 0 && !spansInfo.spansWeekdayAndWeekend && spansInfo.currentIsWeekend
                            ? "line-through opacity-50"
                            : totalMinutes > 0 && (spansInfo.spansWeekdayAndWeekend || !spansInfo.currentIsWeekend)
                            ? !spansInfo.currentIsWeekend
                              ? "text-primary drop-shadow-[0_0_8px_rgba(0,191,255,0.5)]"
                              : ""
                            : ""
                        }`}>
                          {weekdayPrice}₽
                        </p>
                      </div>
                      <div className="w-px h-10 bg-border" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Выходные</p>
                        <p className={`font-mono text-xl font-semibold transition-all ${
                          totalMinutes > 0 && !spansInfo.spansWeekdayAndWeekend && !spansInfo.currentIsWeekend
                            ? "line-through opacity-50"
                            : totalMinutes > 0 && (spansInfo.spansWeekdayAndWeekend || spansInfo.currentIsWeekend)
                            ? spansInfo.currentIsWeekend
                              ? "text-primary drop-shadow-[0_0_8px_rgba(0,191,255,0.5)]"
                              : ""
                            : ""
                        }`}>
                          {weekendPrice}₽
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {!optimalCombination && totalMinutes === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Введите время для расчета стоимости
              </p>
            </div>
          )}
        </Card>
      </main>

      <footer className="border-t border-border/40 bg-card/30 backdrop-blur-sm mt-12">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6">
          <p className="text-xs text-center text-muted-foreground">
            Сделано с душой{" "}
            <a 
              href="https://t.me/amorolive" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover-elevate inline-block px-1 rounded transition-colors"
              data-testid="link-developer"
            >
              @amorolive
            </a>
            {" "}для сети компьютерных клубов «True Gamers» в г. Красноярск
          </p>
        </div>
      </footer>
    </div>
  );
}
