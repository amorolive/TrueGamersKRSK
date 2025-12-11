import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Calendar, Gamepad2, Trophy, Zap, Moon, Info, AlertCircle, HeartPulse, Sun, Timer, Cpu, Monitor, MapPin, Mouse, Keyboard, Headphones } from "lucide-react";
import { 
  ALL_BRANCHES,
  getBranchById,
  getAvailableZones,
  isWeekend, 
  isTariffAvailable,
  findOptimalCombination,
  spansBothWeekdayAndWeekend,
  type Tariff,
  type BranchConfig,
  type Zone 
} from "@shared/schema";

export default function Calculator() {
  const [selectedBranch, setSelectedBranch] = useState<BranchConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedBranch');
      if (saved) {
        const branch = getBranchById(saved);
        if (branch) return branch;
      }
    }
    return ALL_BRANCHES.find(b => b.isActive) || ALL_BRANCHES[0];
  });
  
  const availableZones = useMemo(() => getAvailableZones(selectedBranch.id), [selectedBranch.id]);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hours, setHours] = useState<string>("");
  const [minutes, setMinutes] = useState<string>("");
  const [selectedZoneId, setSelectedZoneId] = useState<string>(() => availableZones[0]?.id || "normal");
  const [devMode, setDevMode] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [devTime, setDevTime] = useState<string>("");
  const [devDate, setDevDate] = useState<string>("");
  const [forceWeekend, setForceWeekend] = useState<boolean | null>(null);

  const selectedZone = useMemo(() => 
    availableZones.find(z => z.id === selectedZoneId) || availableZones[0],
    [availableZones, selectedZoneId]
  );

  useEffect(() => {
    if (availableZones.length > 0 && !availableZones.find(z => z.id === selectedZoneId)) {
      setSelectedZoneId(availableZones[0].id);
    }
  }, [availableZones, selectedZoneId]);
  
  const effectiveTime = devMode && devTime && devDate 
    ? new Date(`${devDate}T${devTime}`)
    : currentTime;
  
  const isWeekendDay = forceWeekend !== null 
    ? forceWeekend 
    : isWeekend(effectiveTime);
  const currentHour = effectiveTime.getHours();
  
  const activeTariffs = selectedZone?.tariffs || [];
  
  const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
  
  const spansInfo = useMemo(() => 
    selectedBranch.isActive ? spansBothWeekdayAndWeekend(effectiveTime, totalMinutes) : { spansWeekdayAndWeekend: false, currentIsWeekend: false },
    [selectedBranch.isActive, effectiveTime, totalMinutes]
  );

  useEffect(() => {
    if (!selectedBranch.isActive || devMode) {
      return;
    }
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, [selectedBranch.isActive, devMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedBranch', selectedBranch.id);
    }
  }, [selectedBranch]);

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
    const baseTariff = tariffId.replace(/^(vip-|bootcamp-|tv-)/, '');
    
    switch (baseTariff) {
      case "cyber-hour":
        return <Clock className="w-5 h-5" />;
      case "triple-kill":
        return <Gamepad2 className="w-5 h-5" />;
      case "ultra-kill":
        return <Trophy className="w-5 h-5" />;
      case "cyber-night":
        return <Moon className="w-5 h-5" />;
      case "cyber-day":
        return <Sun className="w-5 h-5" />;
      case "cyber-24":
        return <Timer className="w-5 h-5" />;
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
    selectedBranch.isActive && totalMinutes > 0 && totalMinutes <= 3600
      ? findOptimalCombination(totalMinutes, currentHour, isWeekendDay, effectiveTime, activeTariffs)
      : null,
    [selectedBranch.isActive, totalMinutes, currentHour, isWeekendDay, effectiveTime, activeTariffs]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.svg" 
              alt="Logo" 
              className="w-20 h-20" 
              onClick={handleLogoClick}
              style={{ cursor: 'pointer' }}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <Select
              value={selectedBranch.id}
              onValueChange={(value) => {
                const branch = getBranchById(value);
                if (branch) setSelectedBranch(branch);
              }}
            >
              <SelectTrigger className="w-[180px] border-border/50 focus:ring-1 focus:ring-primary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_BRANCHES.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-3 h-3 rounded-full ${branch.id === 'lomako' ? 'border border-border' : ''}`}
                        style={{ backgroundColor: branch.color }}
                      />
                      <span>{branch.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-12">
        <div className="mb-4 lg:mb-6">
          <p className="text-sm text-muted-foreground" data-testid="text-current-date">
            {formatDate(effectiveTime)}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedBranch.id}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ 
              duration: 0.3, 
              ease: [0.4, 0, 0.2, 1]
            }}
          >
            {!selectedBranch.isActive ? (
              <Card className="p-8 sm:p-12 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <Gamepad2 className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">В разработке</h2>
                  <p className="text-muted-foreground">
                    Калькулятор для филиала «{selectedBranch.name}» находится в разработке.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Обратитесь к разработчику. Контакт снизу, в футере.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <Card className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
          <div>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm text-muted-foreground">Выберите зону</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {availableZones.map((zone) => (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      selectedZoneId === zone.id
                        ? "shadow-md"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                    style={
                      selectedZoneId === zone.id
                        ? {
                            backgroundColor: selectedBranch.accentColor || 'hsl(var(--primary))',
                            color: selectedBranch.accentColor ? '#000' : 'hsl(var(--primary-foreground))'
                          }
                        : undefined
                    }
                  >
                    {zone.name}
                  </button>
                ))}
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedZoneId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
              >
                <h2 className="text-2xl font-semibold mb-2">
                  Зона {selectedZone?.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedZone?.description || "Укажите время и узнайте оптимальные варианты"}
                </p>
              </motion.div>
            </AnimatePresence>
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
                  max="24"
                  value={hours}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (e.target.value === "" || (value >= 0 && value <= 24)) {
                      setHours(e.target.value);
                      if (value >= 1 && parseInt(minutes) > 59) {
                        setMinutes("59");
                      }
                    }
                  }}
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
                  max={parseInt(hours) >= 1 ? "59" : "1000"}
                  value={minutes}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    const maxMinutes = parseInt(hours) >= 1 ? 59 : 1000;
                    if (e.target.value === "" || (value >= 0 && value <= maxMinutes)) {
                      setMinutes(e.target.value);
                    }
                  }}
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

          {totalMinutes === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Введите время для расчета стоимости
              </p>
            </div>
          ) : optimalCombination ? (
            <div className="space-y-4">
              <div 
                className="bg-accent/50 rounded-md p-4 sm:p-6 space-y-4"
                style={{
                  borderColor: selectedBranch.accentColor ? `${selectedBranch.accentColor}33` : 'hsl(var(--primary) / 0.2)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  boxShadow: selectedBranch.accentColor 
                    ? `0 0 20px ${selectedBranch.accentColor}1a` 
                    : '0 0 20px rgba(0,191,255,0.1)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Оптимальная стоимость
                    </p>
                    <p 
                      className="font-mono text-3xl lg:text-4xl font-bold"
                      style={{
                        color: selectedBranch.accentColor || 'hsl(var(--primary))',
                        textShadow: selectedBranch.accentColor 
                          ? `0 0 12px ${selectedBranch.accentColor}99` 
                          : '0 0 12px rgba(0,191,255,0.6)'
                      }}
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
          ) : null}

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedZoneId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4"
            >
              {activeTariffs.map((tariff) => {
                const isAvailable = isTariffAvailable(tariff, currentHour);
                const weekdayPrice = tariff.priceWeekday;
                const weekendPrice = tariff.priceWeekend;

                return (
                  <Card
                    key={tariff.id}
                    className={`p-4 sm:p-6 transition-all ${
                      tariff.displayOnly 
                        ? "relative overflow-hidden" 
                        : "hover-elevate"
                    } ${
                      !isAvailable && !tariff.displayOnly ? "opacity-50" : ""
                    }`}
                    style={tariff.displayOnly ? {
                      borderColor: selectedBranch.accentColor ? `${selectedBranch.accentColor}66` : 'hsl(var(--primary) / 0.4)',
                      backgroundColor: selectedBranch.accentColor ? `${selectedBranch.accentColor}0d` : 'hsl(var(--primary) / 0.05)'
                    } : undefined}
                    data-testid={`card-tariff-${tariff.id}`}
                  >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-md flex items-center justify-center"
                          style={tariff.displayOnly 
                            ? {
                                backgroundColor: selectedBranch.accentColor ? `${selectedBranch.accentColor}33` : 'hsl(var(--primary) / 0.2)',
                                color: selectedBranch.accentColor || 'hsl(var(--primary))'
                              }
                            : {
                                backgroundColor: selectedBranch.accentColor ? `${selectedBranch.accentColor}33` : 'hsl(var(--accent))',
                                color: selectedBranch.accentColor || 'hsl(var(--accent-foreground))'
                              }
                          }
                        >
                          {getTariffIcon(tariff.id)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{tariff.nameRu}</h3>
                            {tariff.displayOnly && (
                              <Badge 
                                className="text-[10px] px-1.5 py-0.5 font-medium"
                                style={{
                                  backgroundColor: selectedBranch.accentColor ? `${selectedBranch.accentColor}cc` : 'hsl(var(--primary) / 0.8)',
                                  color: selectedBranch.accentColor ? '#000' : 'hsl(var(--primary-foreground))'
                                }}
                              >
                                только в приложении
                              </Badge>
                            )}
                          </div>
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

                    {!isAvailable && !tariff.displayOnly && (
                      <Badge variant="destructive" className="text-xs">
                        Доступно с {tariff.availableFrom}:00 до {tariff.availableTo}:00
                      </Badge>
                    )}

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Будни</p>
                        <p 
                          className={`font-mono text-xl font-semibold transition-all ${
                            totalMinutes > 0 && !spansInfo.spansWeekdayAndWeekend && spansInfo.currentIsWeekend
                              ? "line-through opacity-50"
                              : ""
                          }`}
                          style={
                            totalMinutes > 0 && (spansInfo.spansWeekdayAndWeekend || !spansInfo.currentIsWeekend) && !spansInfo.currentIsWeekend
                              ? {
                                  color: selectedBranch.accentColor || 'hsl(var(--primary))',
                                  textShadow: selectedBranch.accentColor 
                                    ? `0 0 8px ${selectedBranch.accentColor}80` 
                                    : '0 0 8px rgba(0,191,255,0.5)'
                                }
                              : {}
                          }
                        >
                          {weekdayPrice}₽
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Выходные</p>
                        <p 
                          className={`font-mono text-xl font-semibold transition-all ${
                            totalMinutes > 0 && !spansInfo.spansWeekdayAndWeekend && !spansInfo.currentIsWeekend
                              ? "line-through opacity-50"
                              : ""
                          }`}
                          style={
                            totalMinutes > 0 && (spansInfo.spansWeekdayAndWeekend || spansInfo.currentIsWeekend) && spansInfo.currentIsWeekend
                              ? {
                                  color: selectedBranch.accentColor || 'hsl(var(--primary))',
                                  textShadow: selectedBranch.accentColor 
                                    ? `0 0 8px ${selectedBranch.accentColor}80` 
                                    : '0 0 8px rgba(0,191,255,0.5)'
                                }
                              : {}
                          }
                        >
                          {weekendPrice}₽
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </Card>

        <div className="space-y-4">
          {selectedZone?.components && selectedZone.components.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Комплектующие
              </h3>
              <div className="space-y-2">
                {selectedZone.components.map((component) => (
                  <div key={component.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{component.name}</span>
                    <span className="font-medium">{component.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {selectedZone?.peripherals && selectedZone.peripherals.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Mouse className="w-4 h-4" />
                Периферия
              </h3>
              <div className="space-y-2">
                {selectedZone.peripherals.map((peripheral) => (
                  <div key={peripheral.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{peripheral.nameRu}</span>
                    <span className="font-medium text-right">{peripheral.description}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {selectedZone?.seats && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4" />
                Информация о зоне
              </h3>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Количество мест</span>
                  <span className="font-medium">{selectedZone.seats}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <HeartPulse className="w-3.5 h-3.5 text-primary fill-primary/20" />
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
            {" "}для сети компьютерных клубов{" "}
            <a 
              href="https://vk.ru/truegamers_krasnoyarsk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover-elevate inline-block px-1 rounded transition-colors"
              data-testid="link-truegamers"
            >
              «True Gamers» в г. Красноярск
            </a>
            <HeartPulse className="w-3.5 h-3.5 text-primary fill-primary/20" />
          </p>
        </div>
      </footer>
    </div>
  );
}
