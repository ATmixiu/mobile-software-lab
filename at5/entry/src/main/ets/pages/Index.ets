import preferences from '@ohos.data.preferences'

interface HistoryRecord {
  expression: string
  result: string
  timestamp: number
}

@Entry
@Component
struct Index {
  @State display: string = '0'
  @State expression: string = ''
  @State justEvaluated: boolean = false
  @State isError: boolean = false
  @State angleMode: string = 'DEG'
  @State calcMode: string = 'scientific'
  @State invMode: boolean = false
  @State showHistory: boolean = false
  @State history: HistoryRecord[] = []
  @State calcSteps: string[] = []
  @State showSteps: boolean = false
  @State showGraph: boolean = false
  @State graphFunc: string = 'sin(x)'
  @State graphExpr: string = 'sin(x)'
  @State graphError: string = ''
  @State isDarkMode: boolean = true
  @State bgColor: string = '#0A1628'
  @State cardBg: string = '#152A45'
  @State numBg: string = '#1A3A5C'
  @State sciBg: string = '#152A45'
  @State opBg: string = '#00C7BE'
  @State funcBg: string = '#2A4A6E'
  @State textColor: string = '#FFFFFF'
  @State subTextColor: string = '#8BA3C7'
  @State accentColor: string = '#00C7BE'

  private memoryValue: number = 0
  private hasPendingRoot: boolean = false
  private pendingRootBase: number = 0
  private prefs: preferences.Preferences | null = null
  private canvasCtx: CanvasRenderingContext2D = new CanvasRenderingContext2D()
  private displayScroller: Scroller = new Scroller()

  private sciRows: string[][] = [
    ['(', ')', 'MC', 'M+', 'M-', 'MR'],
    ['x!', 'x²', 'x³', 'xʸ', 'eˣ', 'π'],
    ['1/x', '√', '∛', 'ʸ√x', 'Inv', 'DR'],
    ['e', 'ln', 'lg', 'sin', 'cos', 'tan']
  ]
  private baseRows: string[][] = [
    ['AC', '±', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '−'],
    ['1', '2', '3', '+']
  ]
  private ops: string[] = ['+', '−', '×', '÷', '^']
  private digits: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  private graphFuncs: string[] = ['sin(x)', 'cos(x)', 'tan(x)', 'x²', 'x³', '√x', 'ln(x)', 'log(x)', '|x|']

  private applyTheme() {
    if (this.isDarkMode) {
      this.bgColor = '#0A1628'
      this.cardBg = '#152A45'
      this.numBg = '#1A3A5C'
      this.sciBg = '#152A45'
      this.funcBg = '#2A4A6E'
      this.textColor = '#FFFFFF'
      this.subTextColor = '#8BA3C7'
    } else {
      this.bgColor = '#F0F2F5'
      this.cardBg = '#FFFFFF'
      this.numBg = '#FFFFFF'
      this.sciBg = '#E8ECF1'
      this.funcBg = '#D8DEE6'
      this.textColor = '#1A1A2E'
      this.subTextColor = '#6B7280'
    }
  }

  aboutToAppear() {
    try {
      preferences.getPreferences(getContext(this), 'calc_prefs').then((prefs: preferences.Preferences) => {
        this.prefs = prefs
        prefs.get('history', '[]').then((val: preferences.ValueType) => {
          try {
            const arr = JSON.parse(val as string) as HistoryRecord[]
            if (Array.isArray(arr)) {
              this.history = arr.slice(0, 20)
            }
          } catch (e) {
            this.history = []
          }
        })
        prefs.get('themeMode', 'dark').then((val: preferences.ValueType) => {
          this.isDarkMode = (val as string) !== 'light'
          this.applyTheme()
        })
      })
    } catch (e) {
    }
  }

  private saveHistory() {
    if (this.prefs) {
      try {
        this.prefs.put('history', JSON.stringify(this.history))
        this.prefs.flush()
      } catch (e) {
      }
    }
  }

  private addHistory(expr: string, result: string) {
    const rec: HistoryRecord = { expression: expr, result: result, timestamp: Date.now() }
    this.history.unshift(rec)
    if (this.history.length > 20) {
      this.history = this.history.slice(0, 20)
    }
    this.saveHistory()
  }

  private clearHistory() {
    this.history = []
    this.saveHistory()
  }

  private generateSteps(expr: string, result: string, funcType: string, funcArg: string): string[] {
    const steps: string[] = []
    if (funcType === 'factorial') {
      const n = parseInt(funcArg)
      if (!isNaN(n) && n > 0 && n <= 10) {
        let expansion = ''
        for (let i = n; i >= 1; i--) {
          expansion += i + (i > 1 ? ' × ' : '')
        }
        steps.push(funcArg + '!')
        steps.push('= ' + expansion)
        steps.push('= ' + result)
      } else {
        steps.push(funcArg + '! = ' + result)
      }
    } else if (funcType === 'square') {
      steps.push(funcArg + '²')
      steps.push('= ' + funcArg + ' × ' + funcArg)
      steps.push('= ' + result)
    } else if (funcType === 'cube') {
      steps.push(funcArg + '³')
      steps.push('= ' + funcArg + ' × ' + funcArg + ' × ' + funcArg)
      steps.push('= ' + result)
    } else if (funcType === 'sin' || funcType === 'cos' || funcType === 'tan') {
      steps.push('角度模式：' + this.angleMode)
      if (this.angleMode === 'DEG') {
        steps.push(funcArg + '° × π / 180')
        const rad = (parseFloat(funcArg) * Math.PI / 180)
        steps.push('= ' + this.fmt(rad) + ' rad')
      }
      steps.push(funcType + '(' + funcArg + (this.angleMode === 'DEG' ? '°' : '') + ')')
      steps.push('= ' + result)
    } else if (funcType === 'ln') {
      steps.push('ln(' + funcArg + ')')
      steps.push('= logₑ(' + funcArg + ')')
      steps.push('= ' + result)
    } else if (funcType === 'lg') {
      steps.push('lg(' + funcArg + ')')
      steps.push('= log₁₀(' + funcArg + ')')
      steps.push('= ' + result)
    } else if (funcType === 'sqrt') {
      steps.push('√(' + funcArg + ')')
      steps.push('= ' + result)
      const r = parseFloat(result)
      if (!isNaN(r) && Math.abs(r * r - parseFloat(funcArg)) < 0.01) {
        steps.push('因为 ' + result + ' × ' + result + ' = ' + funcArg)
      }
    } else if (funcType === 'cbrt') {
      steps.push('∛(' + funcArg + ')')
      steps.push('= ' + result)
    } else if (funcType === 'reciprocal') {
      steps.push('1 / ' + funcArg)
      steps.push('= ' + result)
    } else if (funcType === 'exp') {
      steps.push('e^' + funcArg)
      steps.push('= ' + result)
    } else if (funcType === 'power') {
      steps.push(expr)
      steps.push('= ' + result)
    } else if (funcType === 'binary') {
      steps.push(expr)
      steps.push('= ' + result)
    } else {
      steps.push(expr + ' = ' + result)
    }
    return steps
  }

  build() {
    Stack() {
      Column() {
        Row() {
          Text('历史')
            .fontSize(16)
            .fontColor(this.subTextColor)
            .width(80)
            .height(44)
            .textAlign(TextAlign.Start)
            .onClick(() => { this.showHistory = true })
          Text('f(x)')
            .fontSize(16)
            .fontColor(this.accentColor)
            .width(60)
            .height(44)
            .textAlign(TextAlign.Center)
            .onClick(() => { this.showGraph = true })
          Text(this.isDarkMode ? '☾' : '☀')
            .fontSize(18)
            .fontColor(this.accentColor)
            .width(50)
            .height(44)
            .textAlign(TextAlign.Center)
            .onClick(() => {
              this.isDarkMode = !this.isDarkMode
              this.applyTheme()
              if (this.prefs !== null) {
                this.prefs.put('themeMode', this.isDarkMode ? 'dark' : 'light')
                this.prefs.flush()
              }
            })
          Text(this.calcMode === 'scientific' ? '科学 ▾' : '普通 ▸')
            .fontSize(16)
            .fontColor(this.subTextColor)
            .width(110)
            .height(44)
            .textAlign(TextAlign.End)
            .onClick(() => { this.toggleCalcMode() })
        }
        .width('100%')
        .justifyContent(FlexAlign.SpaceBetween)
        .padding({ left: 16, right: 16, top: 20 })

        Column() {
          Text(this.angleMode)
            .fontSize(12)
            .fontColor(this.accentColor)
            .width('100%')
            .textAlign(TextAlign.End)
            .height(14)
            .visibility(this.calcMode === 'scientific' ? Visibility.Visible : Visibility.None)
          Text(this.expression === '' ? ' ' : this.expression)
            .fontSize(16)
            .fontColor(this.subTextColor)
            .width('100%')
            .textAlign(TextAlign.End)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .height(22)
          Scroll(this.displayScroller) {
            Text(this.display === '' ? ' ' : (this.isError ? 'Error' : this.formatDisplay(this.display)))
              .fontSize(this.getDisplayFontSize())
              .fontWeight(FontWeight.Bold)
              .fontColor(this.isError ? '#FF6B6B' : this.textColor)
              .textAlign(TextAlign.End)
              .maxLines(1)
              .constraintSize({ minWidth: '100%' })
          }
          .scrollable(ScrollDirection.Horizontal)
          .scrollBar(BarState.Off)
          .edgeEffect(EdgeEffect.None)
          .width('100%')
          .height(60)
          .margin({ top: 2 })
          .align(Alignment.End)
          if (this.calcSteps.length > 0 && !this.showSteps) {
            Text('查看计算过程 →')
              .fontSize(13)
              .fontColor(this.accentColor)
              .width('100%')
              .textAlign(TextAlign.End)
              .height(20)
              .margin({ top: 4 })
              .onClick(() => { this.showSteps = true })
          }
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.End)
        .padding({ left: 16, right: 16, bottom: 6 })

        if (this.calcMode === 'scientific') {
          Column({ space: 4 }) {
            ForEach(this.sciRows, (row: string[], ri: number) => {
              Row({ space: 4 }) {
                ForEach(row, (key: string) => {
                  this.SciButton(key)
                }, (key: string, i: number) => key + '-' + i + '-' + ri)
              }
              .width('100%')
            }, (row: string[], i: number) => i.toString())
          }
          .width('100%')
          .padding({ left: 8, right: 8, bottom: 4 })
        }

        Column({ space: 6 }) {
          ForEach(this.baseRows, (row: string[], ri: number) => {
            Row({ space: 6 }) {
              ForEach(row, (key: string) => {
                this.BaseButton(key)
              }, (key: string, i: number) => key + '-' + i + '-' + ri)
            }
            .width('100%')
          }, (row: string[], i: number) => i.toString())
          Row({ space: 6 }) {
            Text('0')
              .fontSize(24)
              .fontWeight(FontWeight.Medium)
              .fontColor(this.textColor)
              .textAlign(TextAlign.Center)
              .layoutWeight(2)
              .height(50)
              .borderRadius(25)
              .backgroundColor(this.numBg)
              .stateStyles({
                normal: { .opacity(1) },
                pressed: { .opacity(0.6) }
              })
              .onClick(() => { this.onKey('0') })
            Text('.')
              .fontSize(24)
              .fontWeight(FontWeight.Medium)
              .fontColor(this.textColor)
              .textAlign(TextAlign.Center)
              .layoutWeight(1)
              .height(50)
              .borderRadius(25)
              .backgroundColor(this.numBg)
              .stateStyles({
                normal: { .opacity(1) },
                pressed: { .opacity(0.6) }
              })
              .onClick(() => { this.onKey('.') })
            Text('=')
              .fontSize(28)
              .fontWeight(FontWeight.Medium)
              .fontColor('#0A1628')
              .textAlign(TextAlign.Center)
              .layoutWeight(1)
              .height(50)
              .borderRadius(25)
              .backgroundColor(this.opBg)
              .stateStyles({
                normal: { .opacity(1) },
                pressed: { .opacity(0.6) }
              })
              .onClick(() => { this.onKey('=') })
          }
          .width('100%')
        }
        .width('100%')
        .padding({ left: 8, right: 8, bottom: 16 })
      }
      .width('100%')
      .height('100%')
      .backgroundColor(this.bgColor)

      if (this.showHistory) {
        Column() {
          Column() {
            Row() {
              Text('历史记录')
                .fontSize(16)
                .fontColor(this.textColor)
                .fontWeight(FontWeight.Bold)
                .layoutWeight(1)
              Text('清空')
                .fontSize(13)
                .fontColor(this.accentColor)
                .margin({ right: 12 })
                .onClick(() => { this.clearHistory() })
              Text('关闭')
                .fontSize(13)
                .fontColor(this.subTextColor)
                .onClick(() => { this.showHistory = false })
            }
            .width('100%')
            .padding({ left: 16, right: 16, top: 14, bottom: 10 })

            if (this.history.length === 0) {
              Text('暂无历史记录')
                .fontSize(14)
                .fontColor('#556677')
                .width('100%')
                .textAlign(TextAlign.Center)
                .padding({ top: 50, bottom: 50 })
            } else {
              Scroll() {
                Column({ space: 2 }) {
                  ForEach(this.history, (rec: HistoryRecord) => {
                    Row() {
                      Column() {
                        Text(rec.expression)
                          .fontSize(13)
                          .fontColor(this.subTextColor)
                          .width('100%')
                          .textAlign(TextAlign.End)
                          .maxLines(1)
                          .textOverflow({ overflow: TextOverflow.Ellipsis })
                        Text(rec.result)
                          .fontSize(20)
                          .fontWeight(FontWeight.Medium)
                          .fontColor(this.textColor)
                          .width('100%')
                          .textAlign(TextAlign.End)
                          .margin({ top: 2 })
                      }
                      .layoutWeight(1)
                    }
                    .width('100%')
                    .padding({ left: 16, right: 16, top: 8, bottom: 8 })
                    .borderRadius(8)
                    .onClick(() => {
                      this.display = rec.result
                      this.expression = ''
                      this.justEvaluated = true
                      this.isError = false
                      this.hasPendingRoot = false
                      this.showHistory = false
                    })
                  }, (rec: HistoryRecord, idx: number) => rec.timestamp.toString() + '-' + idx.toString())
                }
                .width('100%')
              }
              .layoutWeight(1)
              .scrollBar(BarState.Auto)
            }
          }
          .width('100%')
          .layoutWeight(1)
          .backgroundColor(this.cardBg)
          .borderRadius({ topLeft: 16, topRight: 16 })
        }
        .width('100%')
        .height('100%')
        .backgroundColor('rgba(0,0,0,0.6)')
        .justifyContent(FlexAlign.End)
        .onClick(() => { this.showHistory = false })
      }

      if (this.showSteps) {
        Column() {
          Column() {
            Row() {
              Text('计算过程')
                .fontSize(17)
                .fontWeight(FontWeight.Bold)
                .fontColor(this.textColor)
                .layoutWeight(1)
              Text('关闭')
                .fontSize(14)
                .fontColor(this.subTextColor)
                .onClick(() => { this.showSteps = false })
            }
            .width('100%')
            .padding({ left: 16, right: 16, top: 14, bottom: 10 })

            Scroll() {
              Column({ space: 6 }) {
                ForEach(this.calcSteps, (step: string, idx: number) => {
                  Text(step)
                    .fontSize(idx === this.calcSteps.length - 1 ? 22 : 16)
                    .fontColor(idx === this.calcSteps.length - 1 ? this.accentColor : this.textColor)
                    .fontWeight(idx === this.calcSteps.length - 1 ? FontWeight.Bold : FontWeight.Normal)
                    .width('100%')
                    .textAlign(TextAlign.End)
                    .padding({ left: 16, right: 16, top: 4, bottom: 4 })
                }, (step: string, idx: number) => idx.toString())
              }
              .width('100%')
              .padding({ top: 10, bottom: 20 })
            }
            .layoutWeight(1)
          }
          .width('100%')
          .layoutWeight(1)
          .backgroundColor(this.cardBg)
          .borderRadius({ topLeft: 16, topRight: 16 })
        }
        .width('100%')
        .height('100%')
        .backgroundColor('rgba(0,0,0,0.6)')
        .justifyContent(FlexAlign.End)
        .onClick(() => { this.showSteps = false })
      }

      if (this.showGraph) {
        Column() {
          Row() {
            Text('← 返回')
              .fontSize(15)
              .fontColor(this.accentColor)
              .onClick(() => { this.showGraph = false })
            Text('函数绘图')
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .fontColor(this.textColor)
              .layoutWeight(1)
              .textAlign(TextAlign.Center)
            Text('清空')
              .fontSize(15)
              .fontColor(this.subTextColor)
              .onClick(() => {
                this.canvasCtx.clearRect(0, 0, 360, 320)
                this.canvasCtx.fillStyle = '#0D1F35'
                this.canvasCtx.fillRect(0, 0, 360, 320)
              })
          }
          .width('100%')
          .padding({ left: 16, right: 16, top: 40, bottom: 12 })

          Row() {
            Text('y = ')
              .fontSize(15)
              .fontColor(this.subTextColor)
            TextInput({ text: this.graphExpr, placeholder: '输入函数如 x*x, sin2x, |x|' })
              .layoutWeight(1)
              .height(38)
              .fontSize(14)
              .fontColor(this.textColor)
              .backgroundColor(this.sciBg)
              .borderRadius(8)
              .onChange((val: string) => { this.graphExpr = val })
            Text('绘图')
              .fontSize(14)
              .fontColor('#0A1628')
              .backgroundColor(this.accentColor)
              .borderRadius(8)
              .padding({ left: 14, right: 14, top: 8, bottom: 8 })
              .margin({ left: 8 })
              .onClick(() => { this.doGraphPlot() })
          }
          .width('100%')
          .padding({ left: 16, right: 16, bottom: 6 })

          if (this.graphError !== '') {
            Text(this.graphError)
              .fontSize(12)
              .fontColor('#FF6B6B')
              .width('100%')
              .textAlign(TextAlign.Center)
              .padding({ bottom: 4 })
          }

          Row() {
            Text('y = ' + this.graphFunc)
              .fontSize(15)
              .fontColor(this.accentColor)
              .fontWeight(FontWeight.Medium)
              .layoutWeight(1)
            Text('x ∈ [-10, 10]')
              .fontSize(11)
              .fontColor(this.subTextColor)
          }
          .width('100%')
          .padding({ left: 16, right: 16, bottom: 8 })

          Canvas(this.canvasCtx)
            .width('92%')
            .height(320)
            .backgroundColor('#0D1F35')
            .borderRadius(12)
            .onReady(() => { this.drawGraph() })

          Text('点击下方快捷函数填入输入框，或自行输入后点绘图')
            .fontSize(11)
            .fontColor(this.subTextColor)
            .width('100%')
            .textAlign(TextAlign.Center)
            .padding({ top: 8, bottom: 4 })

          Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.Center }) {
            ForEach(this.graphFuncs, (fn: string) => {
              Text(fn)
                .fontSize(12)
                .fontColor(this.graphFunc === fn ? '#0A1628' : this.textColor)
                .backgroundColor(this.graphFunc === fn ? this.accentColor : this.funcBg)
                .borderRadius(12)
                .padding({ left: 10, right: 10, top: 6, bottom: 6 })
                .margin(3)
                .onClick(() => {
                  this.graphExpr = fn
                  this.doGraphPlot()
                })
            }, (fn: string) => fn)
          }
          .width('100%')
          .padding({ left: 12, right: 12, bottom: 16 })
        }
        .width('100%')
        .height('100%')
        .backgroundColor(this.bgColor)
      }
    }
    .width('100%')
    .height('100%')
  }

  private doGraphPlot() {
    const raw = this.graphExpr.trim()
    if (raw === '') {
      this.graphError = '请输入函数表达式'
      this.clearGraphCurve()
      return
    }
    try {
      const normalized = this.normalizeExpr(raw)
      const testY = this.evaluateAt(normalized, 1)
      if (isNaN(testY) || !isFinite(testY)) {
        const testY2 = this.evaluateAt(normalized, 2)
        if (isNaN(testY2) && !isFinite(testY2)) {
          this.graphError = '表达式格式错误，无法解析'
          this.graphFunc = ''
          this.clearGraphCurve()
          return
        }
      }
      this.graphFunc = normalized
      this.graphError = ''
      setTimeout(() => { this.drawGraph() }, 30)
    } catch (e) {
      this.graphError = '表达式格式错误'
      this.graphFunc = ''
      this.clearGraphCurve()
    }
  }

  private clearGraphCurve() {
    const ctx = this.canvasCtx
    const w = 360
    const h = 320
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#0D1F35'
    ctx.fillRect(0, 0, w, h)
    const cx = w / 2
    const cy = h / 2
    ctx.strokeStyle = '#1A3A5C'
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const x = (i - 5) * 2 * (w / 20) + cx
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
      const y = (i - 5) * 2 * (h / 20) + cy
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    ctx.strokeStyle = '#3A6A9C'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, cy)
    ctx.lineTo(w, cy)
    ctx.moveTo(cx, 0)
    ctx.lineTo(cx, h)
    ctx.stroke()
  }

  private normalizeExpr(raw: string): string {
    let s = raw
    s = s.replace(/²/g, '^2').replace(/³/g, '^3')
    s = s.replace(/π/g, 'pi').replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-')
    let result = ''
    let i = 0
    while (i < s.length) {
      const c = s.charAt(i)
      if (c === '|') {
        let depth = 1
        let j = i + 1
        while (j < s.length && depth > 0) {
          if (s.charAt(j) === '|') depth--
          j++
        }
        const inner = s.substring(i + 1, j - 1)
        result += 'abs(' + this.normalizeExpr(inner) + ')'
        i = j
      } else {
        result += c
        i++
      }
    }
    s = result
    let result2 = ''
    let i2 = 0
    while (i2 < s.length) {
      const c = s.charAt(i2)
      if (c === '√') {
        i2++
        if (i2 < s.length && s.charAt(i2) === '(') {
          let depth = 1
          let j = i2 + 1
          while (j < s.length && depth > 0) {
            if (s.charAt(j) === '(') depth++
            if (s.charAt(j) === ')') depth--
            j++
          }
          const inner = s.substring(i2 + 1, j - 1)
          result2 += 'sqrt(' + this.normalizeExpr(inner) + ')'
          i2 = j
        } else {
          let j = i2
          while (j < s.length) {
            const ch = s.charAt(j)
            if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch === '_') {
              j++
            } else {
              break
            }
          }
          if (j > i2) {
            result2 += 'sqrt(' + s.substring(i2, j) + ')'
            i2 = j
          } else {
            result2 += 'sqrt()'
          }
        }
      } else {
        result2 += c
        i2++
      }
    }
    s = result2
    s = s.replace(/\bsin\s*(\d+(?:\.\d+)?)\s*x\b/g, 'sin($1*x)')
    s = s.replace(/\bcos\s*(\d+(?:\.\d+)?)\s*x\b/g, 'cos($1*x)')
    s = s.replace(/\btan\s*(\d+(?:\.\d+)?)\s*x\b/g, 'tan($1*x)')
    s = s.replace(/\bsqrt\s*(\d+(?:\.\d+)?)\s*x\b/g, 'sqrt($1*x)')
    s = s.replace(/\bln\s*(\d+(?:\.\d+)?)\s*x\b/g, 'ln($1*x)')
    s = s.replace(/\blog\s*(\d+(?:\.\d+)?)\s*x\b/g, 'log($1*x)')
    let prev = ''
    let out = ''
    for (let k = 0; k < s.length; k++) {
      const ch = s.charAt(k)
      const next = k < s.length - 1 ? s.charAt(k + 1) : ''
      if ((ch >= '0' && ch <= '9') || ch === '.') {
        if (next === 'x' || next === '(' || (next >= 'a' && next <= 'z' && next !== 'x')) {
          out += ch + '*'
        } else {
          out += ch
        }
      } else if (ch === 'x') {
        if (next === '(' || (next >= 'a' && next <= 'z' && next !== 'x')) {
          out += 'x*'
        } else {
          out += ch
        }
      } else if (ch === ')') {
        if (next === 'x' || next === '(' || (next >= '0' && next <= '9')) {
          out += ')*'
        } else {
          out += ch
        }
      } else {
        out += ch
      }
      prev = ch
    }
    return out
  }

  private graphEvalSrc: string = ''
  private graphEvalPos: number = 0

  private evaluateAt(expr: string, x: number): number {
    this.graphEvalSrc = expr
    this.graphEvalPos = 0
    return this.graphParseExpr(x)
  }

  private graphParseExpr(x: number): number {
    let v = this.graphParseTerm(x)
    while (this.graphEvalPos < this.graphEvalSrc.length) {
      const c = this.graphEvalSrc.charAt(this.graphEvalPos)
      if (c === '+') {
        this.graphEvalPos++
        v += this.graphParseTerm(x)
      } else if (c === '-') {
        this.graphEvalPos++
        v -= this.graphParseTerm(x)
      } else {
        break
      }
    }
    return v
  }

  private graphParseTerm(x: number): number {
    let v = this.graphParseFactor(x)
    while (this.graphEvalPos < this.graphEvalSrc.length) {
      const c = this.graphEvalSrc.charAt(this.graphEvalPos)
      if (c === '*') {
        this.graphEvalPos++
        v *= this.graphParseFactor(x)
      } else if (c === '/') {
        this.graphEvalPos++
        const d = this.graphParseFactor(x)
        if (d === 0) return NaN
        v /= d
      } else {
        break
      }
    }
    return v
  }

  private graphParseFactor(x: number): number {
    const b = this.graphParseUnary(x)
    if (this.graphEvalPos < this.graphEvalSrc.length && this.graphEvalSrc.charAt(this.graphEvalPos) === '^') {
      this.graphEvalPos++
      const e = this.graphParseFactor(x)
      return Math.pow(b, e)
    }
    return b
  }

  private graphParseUnary(x: number): number {
    if (this.graphEvalPos < this.graphEvalSrc.length) {
      const c = this.graphEvalSrc.charAt(this.graphEvalPos)
      if (c === '+') {
        this.graphEvalPos++
        return this.graphParseUnary(x)
      }
      if (c === '-') {
        this.graphEvalPos++
        return -this.graphParseUnary(x)
      }
    }
    return this.graphParsePrimary(x)
  }

  private graphParsePrimary(x: number): number {
    if (this.graphEvalPos >= this.graphEvalSrc.length) throw new Error('end')
    const c = this.graphEvalSrc.charAt(this.graphEvalPos)
    if (c === '(') {
      this.graphEvalPos++
      const v = this.graphParseExpr(x)
      if (this.graphEvalPos < this.graphEvalSrc.length && this.graphEvalSrc.charAt(this.graphEvalPos) === ')') {
        this.graphEvalPos++
      }
      return v
    }
    if (c === 'x') {
      this.graphEvalPos++
      return x
    }
    const funcs = ['sin', 'cos', 'tan', 'sqrt', 'abs', 'ln', 'log']
    for (let fi = 0; fi < funcs.length; fi++) {
      const fn = funcs[fi]
      if (this.graphEvalSrc.substring(this.graphEvalPos, this.graphEvalPos + fn.length) === fn) {
        this.graphEvalPos += fn.length
        if (this.graphEvalPos < this.graphEvalSrc.length && this.graphEvalSrc.charAt(this.graphEvalPos) === '(') {
          this.graphEvalPos++
          const arg = this.graphParseExpr(x)
          if (this.graphEvalPos < this.graphEvalSrc.length && this.graphEvalSrc.charAt(this.graphEvalPos) === ')') {
            this.graphEvalPos++
          }
          if (fn === 'sin') return Math.sin(arg)
          if (fn === 'cos') return Math.cos(arg)
          if (fn === 'tan') return Math.tan(arg)
          if (fn === 'sqrt') return arg >= 0 ? Math.sqrt(arg) : NaN
          if (fn === 'abs') return Math.abs(arg)
          if (fn === 'ln') return arg > 0 ? Math.log(arg) : NaN
          if (fn === 'log') return arg > 0 ? Math.log(arg) / Math.LN10 : NaN
        }
      }
    }
    if (this.graphEvalSrc.substring(this.graphEvalPos, this.graphEvalPos + 2) === 'pi') {
      this.graphEvalPos += 2
      return Math.PI
    }
    const start = this.graphEvalPos
    while (this.graphEvalPos < this.graphEvalSrc.length) {
      const d = this.graphEvalSrc.charAt(this.graphEvalPos)
      if ((d >= '0' && d <= '9') || d === '.') {
        this.graphEvalPos++
      } else {
        break
      }
    }
    if (this.graphEvalPos === start) throw new Error('no num')
    const v = parseFloat(this.graphEvalSrc.substring(start, this.graphEvalPos))
    if (isNaN(v)) throw new Error('bad num')
    return v
  }

  private drawGraph() {
    const ctx = this.canvasCtx
    const w = 360
    const h = 320
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#0D1F35'
    ctx.fillRect(0, 0, w, h)

    let cx = w / 2
    const cy = h / 2
    const xMin = -10
    const xMax = 10
    const yMin = -10
    const yMax = 10
    const scaleX = w / (xMax - xMin)
    const scaleY = h / (yMax - yMin)

    ctx.strokeStyle = '#1A3A5C'
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const x = (i - 5) * 2 * scaleX + cx
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
      const y = (i - 5) * 2 * scaleY + cy
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    ctx.strokeStyle = '#3A6A9C'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, cy)
    ctx.lineTo(w, cy)
    ctx.moveTo(cx, 0)
    ctx.lineTo(cx, h)
    ctx.stroke()

    ctx.fillStyle = '#5A8ABC'
    ctx.font = '10px sans-serif'
    ctx.fillText('x', w - 12, cy - 4)
    ctx.fillText('y', cx + 4, 12)
    if (cx > 0) ctx.fillText('0', cx + 3, cy + 12)

    ctx.strokeStyle = this.accentColor
    ctx.lineWidth = 2
    ctx.beginPath()
    let started = false
    const expr = this.graphFunc
    for (let px = 0; px <= w; px++) {
      const x = xMin + px / scaleX
      let y: number
      try {
        y = this.evaluateAt(expr, x)
      } catch (e) {
        y = NaN
      }
      const py = cy - y * scaleY
      if (isNaN(y) || !isFinite(y) || py < -50 || py > h + 50) {
        started = false
        continue
      }
      if (!started) {
        ctx.moveTo(px, py)
        started = true
      } else {
        ctx.lineTo(px, py)
      }
    }
    ctx.stroke()
  }

  @Builder
  SciButton(key: string) {
    Text(this.getSciLabel(key))
      .fontSize(this.getSciFontSize(key))
      .fontWeight(FontWeight.Medium)
      .fontColor(this.getSciTextColor(key))
      .textAlign(TextAlign.Center)
      .layoutWeight(1)
      .height(36)
      .borderRadius(18)
      .backgroundColor(this.getSciBgColor(key))
      .stateStyles({
        normal: { .opacity(1) },
        pressed: { .opacity(0.6) }
      })
      .onClick(() => { this.onKey(key) })
  }

  @Builder
  BaseButton(key: string) {
    Text(key)
      .fontSize(key === 'AC' ? 18 : 24)
      .fontWeight(FontWeight.Medium)
      .fontColor(this.getBaseTextColor(key))
      .textAlign(TextAlign.Center)
      .layoutWeight(1)
      .height(50)
      .borderRadius(25)
      .backgroundColor(this.getBaseBgColor(key))
      .stateStyles({
        normal: { .opacity(1) },
        pressed: { .opacity(0.6) }
      })
      .onClick(() => { this.onKey(key) })
  }

  private getSciLabel(key: string): string {
    if (this.invMode) {
      if (key === 'sin') return 'asin'
      if (key === 'cos') return 'acos'
      if (key === 'tan') return 'atan'
      if (key === 'ln') return 'eˣ'
      if (key === 'lg') return '10ˣ'
    }
    if (key === 'DR') return this.angleMode
    return key
  }

  private getSciFontSize(key: string): number {
    if (key === 'DR') return 13
    if (key === 'Inv' || key === 'MC' || key === 'MR') return 13
    return 14
  }

  private getSciBgColor(key: string): string {
    if (key === 'Inv' && this.invMode) return this.accentColor
    if (key === 'DR') return this.accentColor
    if (key === 'MC' || key === 'M+' || key === 'M-' || key === 'MR') return this.funcBg
    if (key === '(' || key === ')') return this.funcBg
    return this.sciBg
  }

  private getSciTextColor(key: string): string {
    if (key === 'DR') return '#0A1628'
    if (key === 'Inv' && this.invMode) return '#0A1628'
    return this.textColor
  }

  private getBaseBgColor(key: string): string {
    if (this.ops.includes(key)) return this.opBg
    if (key === 'AC' || key === '±' || key === '%') return '#4A6A8C'
    return this.numBg
  }

  private getBaseTextColor(key: string): string {
    if (this.ops.includes(key)) return '#0A1628'
    if (key === 'AC' || key === '±' || key === '%') return '#0A1628'
    return this.textColor
  }

  private onKey(key: string) {
    if (key === '') return
    if (this.digits.includes(key)) {
      this.inputDigit(key)
    } else if (key === '.') {
      this.inputDot()
    } else if (key === 'AC') {
      this.clearAll()
    } else if (key === '±') {
      this.toggleSign()
    } else if (key === '%') {
      this.inputPercent()
    } else if (key === 'DR') {
      this.toggleAngleMode()
    } else if (key === 'Inv') {
      this.invMode = !this.invMode
    } else if (key === 'π') {
      this.inputSymbol('π')
    } else if (key === 'e') {
      this.inputSymbol('e')
    } else if (key === 'xʸ') {
      this.appendOperator('^')
    } else if (this.ops.includes(key)) {
      this.appendOperator(key)
    } else if (key === '(' || key === ')') {
      this.appendParen(key)
    } else if (key === '=') {
      this.evaluate()
    } else if (key === 'MC') {
      this.memoryClear()
    } else if (key === 'M+') {
      this.memoryAdd()
    } else if (key === 'M-') {
      this.memorySub()
    } else if (key === 'MR') {
      this.memoryRecall()
    } else {
      this.applySciFunction(key)
    }
  }

  private inputDigit(d: string) {
    if (this.isError) this.resetState()
    if (this.justEvaluated) {
      this.expression = ''
      this.display = d
      this.justEvaluated = false
      this.hasPendingRoot = false
      this.calcSteps = []
      return
    }
    if (this.display === '0' || this.display === '') {
      this.display = d
    } else if (this.display.replace('.', '').replace('-', '').length < 30) {
      this.display += d
    }
    setTimeout(() => { this.displayScroller.scrollEdge(Edge.End) }, 10)
  }

  private inputDot() {
    if (this.isError) this.resetState()
    if (this.justEvaluated) {
      this.expression = ''
      this.display = '0.'
      this.justEvaluated = false
      this.hasPendingRoot = false
      this.calcSteps = []
      return
    }
    if (this.display === '' || this.display === '0') {
      this.display = '0.'
    } else if (!this.display.includes('.')) {
      this.display += '.'
    }
    setTimeout(() => { this.displayScroller.scrollEdge(Edge.End) }, 10)
  }

  private appendOperator(op: string) {
    if (this.isError) return
    if (this.hasPendingRoot) return
    if (this.justEvaluated) {
      this.expression = this.display
      this.justEvaluated = false
    } else if (this.display !== '' && this.display !== '-') {
      this.expression += this.display
    }
    this.display = ''
    if (this.expression.length > 0 && this.ops.includes(this.expression.charAt(this.expression.length - 1))) {
      this.expression = this.expression.substring(0, this.expression.length - 1)
    }
    this.expression += op
  }

  private appendParen(p: string) {
    if (this.isError) this.resetState()
    if (this.justEvaluated) {
      this.expression = ''
      this.display = '0'
      this.justEvaluated = false
    }
    if (p === '(') {
      if (this.display !== '' && this.display !== '0' && this.display !== '-') {
        this.expression += this.display + '×'
      }
      this.expression += '('
      this.display = ''
    } else {
      const open = this.countChar(this.expression, '(')
      const close = this.countChar(this.expression, ')')
      if (open > close && this.display !== '' && this.display !== '-') {
        this.expression += this.display + ')'
        this.display = ''
      }
    }
  }

  private countChar(s: string, c: string): number {
    let n = 0
    for (let i = 0; i < s.length; i++) {
      if (s.charAt(i) === c) n++
    }
    return n
  }

  private evaluate() {
    if (this.isError) return
    if (this.hasPendingRoot) {
      this.evaluatePendingRoot()
      return
    }
    if (this.justEvaluated) {
      return
    }
    let fullExpr = this.expression
    if (this.display !== '' && this.display !== '-') {
      fullExpr += this.display
    }
    if (fullExpr === '') return
    const open = this.countChar(fullExpr, '(')
    const close = this.countChar(fullExpr, ')')
    for (let i = 0; i < open - close; i++) {
      fullExpr += ')'
    }
    while (fullExpr.length > 0 && this.ops.includes(fullExpr.charAt(fullExpr.length - 1))) {
      fullExpr = fullExpr.substring(0, fullExpr.length - 1)
    }
    if (fullExpr === '') return
    try {
      const result = this.evalExpression(fullExpr)
      const resultStr = this.fmt(result)
      const isRealOp = this.expression !== '' || this.countChar(fullExpr, '+') > 0 || this.countChar(fullExpr, '−') > 0 || this.countChar(fullExpr, '×') > 0 || this.countChar(fullExpr, '÷') > 0 || this.countChar(fullExpr, '^') > 0 || this.countChar(fullExpr, '(') > 0
      this.expression = fullExpr
      this.display = resultStr
      this.justEvaluated = true
      this.isError = false
      if (isRealOp && resultStr !== 'Error') {
        this.calcSteps = this.generateSteps(fullExpr, resultStr, 'binary', '')
        this.addHistory(fullExpr, resultStr)
      } else {
        this.calcSteps = []
      }
    } catch (e) {
      this.setError()
    }
  }

  private evaluatePendingRoot() {
    if (this.display === '' || this.display === '-') {
      this.hasPendingRoot = false
      this.expression = ''
      this.display = this.fmt(this.pendingRootBase)
      this.justEvaluated = true
      return
    }
    const y = parseFloat(this.display)
    if (isNaN(y) || y === 0) {
      this.setError()
      this.hasPendingRoot = false
      return
    }
    try {
      let result: number
      const base = this.pendingRootBase
      if (base < 0) {
        if (y !== Math.floor(y) || y % 2 === 0) throw new Error('invalid')
        result = -Math.pow(-base, 1 / y)
      } else {
        result = Math.pow(base, 1 / y)
      }
      if (isNaN(result) || !isFinite(result)) throw new Error('invalid')
      const resultStr = this.fmt(result)
      const expr = this.pendingRootBase + '^(1/' + y + ')'
      this.expression = expr
      this.display = resultStr
      this.justEvaluated = true
      this.isError = false
      this.hasPendingRoot = false
      this.calcSteps = this.generateSteps(expr, resultStr, 'power', '')
      this.addHistory(expr, resultStr)
    } catch (e) {
      this.setError()
      this.hasPendingRoot = false
    }
  }

  private clearAll() {
    this.display = '0'
    this.expression = ''
    this.justEvaluated = false
    this.isError = false
    this.hasPendingRoot = false
    this.calcSteps = []
  }

  private toggleSign() {
    if (this.isError || this.display === '0' || this.display === '') return
    if (this.display.startsWith('-')) {
      this.display = this.display.substring(1)
    } else {
      this.display = '-' + this.display
    }
  }

  private inputPercent() {
    if (this.isError || this.display === '' || this.display === '-') return
    const v = parseFloat(this.display) / 100
    this.display = this.fmt(v)
  }

  private toggleAngleMode() {
    this.angleMode = this.angleMode === 'DEG' ? 'RAD' : 'DEG'
  }

  private toggleCalcMode() {
    this.calcMode = this.calcMode === 'scientific' ? 'simple' : 'scientific'
  }

  private inputConstant(c: number) {
    if (this.isError) this.resetState()
    if (this.justEvaluated) {
      this.expression = ''
      this.justEvaluated = false
      this.calcSteps = []
    }
    if (this.hasPendingRoot) return
    this.display = this.fmt(c)
  }

  private inputSymbol(sym: string) {
    if (this.isError) this.resetState()
    if (this.justEvaluated) {
      this.expression = ''
      this.justEvaluated = false
      this.calcSteps = []
    }
    if (this.hasPendingRoot) return
    if (this.display === '0' || this.display === '') {
      this.display = sym
    } else {
      this.display += sym
    }
  }

  private evalDisplay(): number {
    const s = this.display
    if (s === 'π') return Math.PI
    if (s === 'e') return Math.E
    if (s.includes('π') || s.includes('e')) {
      try {
        this.evalSrc = s
        this.evalPos = 0
        return this.parseExpr()
      } catch (e) {
        return parseFloat(s)
      }
    }
    return parseFloat(s)
  }

  private memoryClear() {
    this.memoryValue = 0
  }

  private memoryAdd() {
    if (this.isError || this.display === '' || this.display === '-') return
    const v = parseFloat(this.display)
    if (!isNaN(v)) this.memoryValue += v
  }

  private memorySub() {
    if (this.isError || this.display === '' || this.display === '-') return
    const v = parseFloat(this.display)
    if (!isNaN(v)) this.memoryValue -= v
  }

  private memoryRecall() {
    if (this.isError) this.resetState()
    if (this.justEvaluated) {
      this.expression = ''
      this.justEvaluated = false
      this.calcSteps = []
    }
    this.display = this.fmt(this.memoryValue)
  }

  private applySciFunction(key: string) {
    if (this.isError || this.display === '' || this.display === '-') return
    if (this.hasPendingRoot) return
    const x = this.evalDisplay()
    if (isNaN(x)) return
    const argStr = this.display
    try {
      let result = 0
      let label = key
      let funcType = 'binary'
      if (key === 'sin') {
        funcType = 'sin'
        if (this.invMode) {
          if (x < -1 || x > 1) throw new Error('invalid')
          result = this.fromRad(Math.asin(x))
          label = 'asin'
          funcType = 'sin'
        } else {
          result = Math.sin(this.toRad(x))
        }
      } else if (key === 'cos') {
        funcType = 'cos'
        if (this.invMode) {
          if (x < -1 || x > 1) throw new Error('invalid')
          result = this.fromRad(Math.acos(x))
          label = 'acos'
          funcType = 'cos'
        } else {
          result = Math.cos(this.toRad(x))
        }
      } else if (key === 'tan') {
        funcType = 'tan'
        if (this.invMode) {
          result = this.fromRad(Math.atan(x))
          label = 'atan'
          funcType = 'tan'
        } else {
          const rad = this.toRad(x)
          if (Math.abs(Math.cos(rad)) < 1e-10) throw new Error('undefined')
          result = Math.tan(rad)
        }
      } else if (key === 'ln') {
        funcType = 'ln'
        if (this.invMode) {
          result = Math.exp(x)
          label = 'eˣ'
          funcType = 'exp'
        } else {
          if (x <= 0) throw new Error('invalid')
          result = Math.log(x)
        }
      } else if (key === 'lg') {
        funcType = 'lg'
        if (this.invMode) {
          result = Math.pow(10, x)
          label = '10ˣ'
          funcType = 'exp'
        } else {
          if (x <= 0) throw new Error('invalid')
          result = Math.log(x) / Math.LN10
        }
      } else if (key === '√') {
        funcType = 'sqrt'
        if (x < 0) throw new Error('invalid')
        result = Math.sqrt(x)
      } else if (key === '∛') {
        funcType = 'cbrt'
        result = Math.cbrt(x)
      } else if (key === 'x²') {
        funcType = 'square'
        result = x * x
      } else if (key === 'x³') {
        funcType = 'cube'
        result = x * x * x
      } else if (key === '1/x') {
        funcType = 'reciprocal'
        if (x === 0) throw new Error('div0')
        result = 1 / x
      } else if (key === 'eˣ') {
        funcType = 'exp'
        result = Math.exp(x)
      } else if (key === 'x!') {
        funcType = 'factorial'
        result = this.factorial(x)
      } else if (key === 'ʸ√x') {
        this.pendingRootBase = x
        this.hasPendingRoot = true
        this.expression = x + '^(1/'
        this.display = ''
        this.justEvaluated = false
        return
      } else {
        return
      }
      let expr: string
      if (key === 'x²' || key === 'x³' || key === 'x!') {
        const suffix = key === 'x²' ? '²' : (key === 'x³' ? '³' : '!')
        expr = argStr + suffix
      } else {
        expr = label + '(' + argStr + ')'
      }
      const resultStr = this.fmt(result)
      if (this.expression !== '' && !this.justEvaluated) {
        this.expression = this.expression + expr
        this.display = ''
        this.justEvaluated = false
        this.calcSteps = []
        this.evaluate()
      } else {
        this.expression = expr
        this.display = resultStr
        this.justEvaluated = true
        this.calcSteps = this.generateSteps(expr, resultStr, funcType, argStr)
        this.addHistory(expr, resultStr)
      }
    } catch (e) {
      this.setError()
    }
  }

  private factorial(n: number): number {
    if (n < 0 || n !== Math.floor(n) || n > 170) throw new Error('invalid')
    if (n === 0 || n === 1) return 1
    let r = 1
    for (let i = 2; i <= n; i++) r *= i
    return r
  }

  private toRad(x: number): number {
    if (this.angleMode === 'DEG') return x * Math.PI / 180
    return x
  }

  private fromRad(x: number): number {
    if (this.angleMode === 'DEG') return x * 180 / Math.PI
    return x
  }

  private setError() {
    this.display = 'Error'
    this.isError = true
    this.expression = ''
    this.justEvaluated = false
    this.hasPendingRoot = false
    this.calcSteps = []
  }

  private resetState() {
    this.display = '0'
    this.expression = ''
    this.isError = false
    this.justEvaluated = false
    this.hasPendingRoot = false
    this.calcSteps = []
  }

  private evalPos: number = 0
  private evalSrc: string = ''

  private evalExpression(s: string): number {
    this.evalSrc = s
    this.evalPos = 0
    const r = this.parseExpr()
    if (this.evalPos < s.length) throw new Error('Unexpected')
    return r
  }

  private parseExpr(): number {
    let left = this.parseTerm()
    while (this.evalPos < this.evalSrc.length) {
      const c = this.evalSrc.charAt(this.evalPos)
      if (c === '+' || c === '−') {
        this.evalPos++
        const right = this.parseTerm()
        left = c === '+' ? left + right : left - right
      } else {
        break
      }
    }
    return left
  }

  private parseTerm(): number {
    let left = this.parseFactor()
    while (this.evalPos < this.evalSrc.length) {
      const c = this.evalSrc.charAt(this.evalPos)
      if (c === '×' || c === '÷') {
        this.evalPos++
        const right = this.parseFactor()
        if (c === '÷') {
          if (right === 0) throw new Error('div0')
          left = left / right
        } else {
          left = left * right
        }
      } else {
        break
      }
    }
    return left
  }

  private parseFactor(): number {
    const b = this.parseUnary()
    if (this.evalPos < this.evalSrc.length && this.evalSrc.charAt(this.evalPos) === '^') {
      this.evalPos++
      const e = this.parseFactor()
      return Math.pow(b, e)
    }
    return b
  }

  private parseUnary(): number {
    if (this.evalPos < this.evalSrc.length) {
      const c = this.evalSrc.charAt(this.evalPos)
      if (c === '+') {
        this.evalPos++
        return this.parseUnary()
      }
      if (c === '−') {
        this.evalPos++
        return -this.parseUnary()
      }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): number {
    if (this.evalPos >= this.evalSrc.length) throw new Error('end')
    const c = this.evalSrc.charAt(this.evalPos)
    if (c === '(') {
      this.evalPos++
      const v = this.parseExpr()
      if (this.evalPos < this.evalSrc.length && this.evalSrc.charAt(this.evalPos) === ')') {
        this.evalPos++
      } else {
        throw new Error('no )')
      }
      return v
    }
    if (c === 'π') {
      this.evalPos++
      return Math.PI
    }
    if (c === 'e' && (this.evalPos === 0 || !this.isDigit(this.evalSrc.charAt(this.evalPos - 1)))) {
      this.evalPos++
      return Math.E
    }
    const funcs = ['sin', 'cos', 'tan', 'ln', 'lg', 'sqrt', 'cbrt', 'abs']
    for (let fi = 0; fi < funcs.length; fi++) {
      const fn = funcs[fi]
      if (this.evalSrc.substring(this.evalPos, this.evalPos + fn.length) === fn) {
        this.evalPos += fn.length
        if (this.evalPos < this.evalSrc.length && this.evalSrc.charAt(this.evalPos) === '(') {
          this.evalPos++
          const arg = this.parseExpr()
          if (this.evalPos < this.evalSrc.length && this.evalSrc.charAt(this.evalPos) === ')') {
            this.evalPos++
          }
          if (fn === 'sin') return Math.sin(this.toRad(arg))
          if (fn === 'cos') return Math.cos(this.toRad(arg))
          if (fn === 'tan') {
            const rad = this.toRad(arg)
            if (Math.abs(Math.cos(rad)) < 1e-10) throw new Error('undefined')
            return Math.tan(rad)
          }
          if (fn === 'ln') {
            if (arg <= 0) throw new Error('invalid')
            return Math.log(arg)
          }
          if (fn === 'lg') {
            if (arg <= 0) throw new Error('invalid')
            return Math.log(arg) / Math.LN10
          }
          if (fn === 'sqrt') {
            if (arg < 0) throw new Error('invalid')
            return Math.sqrt(arg)
          }
          if (fn === 'cbrt') return Math.cbrt(arg)
          if (fn === 'abs') return Math.abs(arg)
        }
      }
    }
    return this.parseNumber()
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9'
  }

  private parseNumber(): number {
    const start = this.evalPos
    while (this.evalPos < this.evalSrc.length) {
      const c = this.evalSrc.charAt(this.evalPos)
      if ((c >= '0' && c <= '9') || c === '.') {
        this.evalPos++
      } else {
        break
      }
    }
    if (this.evalPos === start) throw new Error('no num')
    if (this.evalPos < this.evalSrc.length) {
      const c = this.evalSrc.charAt(this.evalPos)
      if (c === 'E' || c === 'e') {
        const before = this.evalSrc.substring(start, this.evalPos)
        if (before.length > 0 && before !== '.') {
          this.evalPos++
          if (this.evalPos < this.evalSrc.length) {
            const sign = this.evalSrc.charAt(this.evalPos)
            if (sign === '+' || sign === '-') this.evalPos++
          }
          while (this.evalPos < this.evalSrc.length) {
            const d = this.evalSrc.charAt(this.evalPos)
            if (d >= '0' && d <= '9') this.evalPos++
            else break
          }
        }
      }
    }
    const v = parseFloat(this.evalSrc.substring(start, this.evalPos))
    if (isNaN(v)) throw new Error('bad num')
    return v
  }

  private fmt(n: number): string {
    if (isNaN(n) || !isFinite(n)) return 'Error'
    const r = Math.round(n * 1e12) / 1e12
    if (r === 0) return '0'
    const abs = Math.abs(r)
    if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) {
      const raw = r.toExponential(10)
      const parts = raw.split('e')
      let mantissa = parts[0]
      if (mantissa.includes('.')) {
        mantissa = mantissa.replace(/0+$/, '')
        if (mantissa.endsWith('.')) mantissa = mantissa.slice(0, -1)
      }
      let exp = parts[1]
      if (exp.startsWith('+')) exp = exp.slice(1)
      return mantissa + 'E' + exp
    }
    return r.toString()
  }

  private formatDisplay(s: string): string {
    if (s === 'Error' || s === '' || s === '-') return s
    if (s.includes('E') || s.includes('π') || s.includes('e')) return s
    const neg = s.startsWith('-')
    let body = neg ? s.slice(1) : s
    const dotIdx = body.indexOf('.')
    let intPart = dotIdx >= 0 ? body.slice(0, dotIdx) : body
    const decPart = dotIdx >= 0 ? body.slice(dotIdx) : ''
    if (intPart.length > 3) {
      const arr: string[] = []
      let cnt = 0
      for (let i = intPart.length - 1; i >= 0; i--) {
        arr.unshift(intPart.charAt(i))
        cnt++
        if (cnt === 3 && i > 0) {
          arr.unshift(',')
          cnt = 0
        }
      }
      intPart = arr.join('')
    }
    return (neg ? '-' : '') + intPart + decPart
  }

  private getDisplayFontSize(): number {
    const len = this.display.replace('.', '').replace('-', '').length
    if (len > 18) return 32
    if (len > 12) return 38
    if (len > 9) return 44
    return 52
  }
}
