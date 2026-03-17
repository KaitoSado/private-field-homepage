<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { 
  Activity, Zap, Layers, Play, CheckCircle, XCircle, 
  Terminal, Settings, Cpu, Search, Code as CodeIcon, FileCode, Layout 
} from 'lucide-vue-next'

const data = ref(null)
const connected = ref(false)
let ws = null

const connect = () => {
  ws = new WebSocket("ws://localhost:8000/ws")
  ws.onopen = () => { connected.value = true }
  ws.onclose = () => {
    connected.value = false
    setTimeout(connect, 2000)
  }
  ws.onmessage = (event) => {
    data.value = JSON.parse(event.data)
  }
}

onMounted(() => {
  connect()
})

onUnmounted(() => {
  if (ws) ws.close()
})
</script>

<template>
  <div v-if="!data" class="h-screen bg-black flex items-center justify-center font-mono text-cyan-400">
    <div class="flex flex-col items-center gap-4">
      <Activity class="animate-pulse" />
      <p class="animate-bounce uppercase">Connecting to Agent Backend (Nuxt)...</p>
    </div>
  </div>

  <div v-else class="min-h-screen bg-[#050505] text-[#e0e0e0] font-mono p-4 flex flex-col gap-4">
    <!-- Header -->
    <header class="flex items-center justify-between border-b border-white/5 pb-4 px-2">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 bg-cyan-950/30 border border-cyan-500/30 rounded flex items-center justify-center">
          <Zap class="text-cyan-400 w-5 h-5" />
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-tighter text-cyan-500 italic uppercase">Agent Architect Monitor</h1>
          <p class="text-[10px] text-white/40 uppercase tracking-widest">Real-time Autonomous Workflow (Vue/Nuxt Edition)</p>
        </div>
      </div>
      <div class="flex gap-4 items-center">
        <div class="bg-white/5 border border-white/5 px-3 py-1 rounded min-w-[80px]">
          <span class="text-[9px] text-white/30 block uppercase font-bold mb-1">Total</span>
          <p class="text-sm font-bold text-white/80">{{ data.overview.totalTasks }}</p>
        </div>
        <div class="bg-white/5 border border-white/5 px-3 py-1 rounded min-w-[80px]">
          <span class="text-[9px] text-emerald-500 block uppercase font-bold mb-1">Success</span>
          <p class="text-sm font-bold text-white/80">{{ data.overview.completedTasks }}</p>
        </div>
        <div :class="`px-3 py-2 border rounded text-[10px] flex items-center gap-2 ${connected ? 'border-cyan-500/20 text-cyan-400 bg-cyan-500/5' : 'border-rose-500/20 text-rose-400 bg-rose-500/5'}`">
          <span :class="`w-2 h-2 rounded-full ${connected ? 'bg-cyan-400 animate-pulse' : 'bg-rose-400'}`"></span>
          {{ connected ? 'LIVE' : 'OFFLINE' }}
        </div>
      </div>
    </header>

    <div class="grid grid-cols-12 gap-4 flex-1 overflow-hidden">
      <!-- Left Panel -->
      <div class="col-span-12 lg:col-span-8 flex flex-col gap-4 overflow-hidden">
        
        <!-- Workflow Graph -->
        <div class="bg-[#0c0c0c] border border-white/5 p-4 rounded-lg relative overflow-hidden">
          <h2 class="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Activity size="14" class="text-cyan-500" /> Agent Workflow Graph
          </h2>
          <div class="flex justify-between items-center relative py-6 px-10">
            <div class="absolute inset-x-0 top-[52px] h-[1px] bg-white/5"></div>
            <div v-for="agent in data.workflow.agents" :key="agent" 
                 :class="`relative z-10 flex flex-col items-center gap-2 transition-all duration-500 ${data.workflow.currentAgent === agent ? 'scale-110 opacity-100' : 'opacity-20 grayscale'}`">
              <div :class="`w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all ${data.workflow.currentAgent === agent ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'border-white/10 bg-white/5'}`">
                <Layout v-if="agent === 'planner'" size="20" class="text-cyan-400" />
                <CodeIcon v-if="agent === 'coder'" size="20" class="text-cyan-400" />
                <Activity v-if="agent === 'tester'" size="20" class="text-cyan-400" />
                <Search v-if="agent === 'reviewer'" size="20" class="text-cyan-400" />
              </div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-400">{{ agent }}</span>
              <div v-if="data.workflow.currentAgent === agent" class="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping"></div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 flex-1 min-h-0">
          <!-- Queue -->
          <div class="bg-[#0c0c0c] border border-white/5 p-4 rounded-lg flex flex-col min-h-0 overflow-hidden">
            <h2 class="text-[11px] font-bold text-white/60 uppercase mb-3 flex items-center gap-2">
              <Settings size="14" class="text-cyan-500" /> Active Queue
            </h2>
            <div class="overflow-y-auto space-y-2 pr-2">
              <div v-for="task in data.queue" :key="task.id" class="bg-white/5 border border-white/5 p-3 rounded flex items-center justify-between">
                <div>
                  <p class="text-[10px] text-cyan-400 font-bold tracking-wider">{{ task.id }}</p>
                  <p class="text-xs text-white/80">{{ task.name }}</p>
                </div>
                <span :class="`text-[9px] px-2 py-0.5 rounded ${task.status === 'running' ? 'bg-cyan-500/10 text-cyan-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'}`">
                  {{ task.status.toUpperCase() }}
                </span>
              </div>
            </div>
          </div>

          <!-- Activity Logs -->
          <div class="bg-[#0c0c0c] border border-white/5 p-4 rounded-lg flex flex-col min-h-0 overflow-hidden">
            <h2 class="text-[11px] font-bold text-white/60 uppercase mb-3 flex items-center gap-2">
              <Terminal size="14" class="text-cyan-500" /> Activity Stream
            </h2>
            <div class="bg-black/40 border border-white/5 rounded p-3 flex-1 overflow-y-auto font-mono text-[11px] space-y-1">
              <div v-for="(log, i) in data.logs.slice().reverse()" :key="i" class="flex gap-2">
                <span class="text-white/20">[{{ log.time }}]</span>
                <span :class="log.msg.includes('failed') ? 'text-rose-400' : 'text-white/70'">{{ log.msg }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel -->
      <div class="col-span-12 lg:col-span-4 flex flex-col gap-4 overflow-hidden">
        <div class="bg-[#0c0c0c] border border-white/5 p-4 rounded-lg">
          <h2 class="text-[11px] font-bold text-white/60 uppercase mb-4">Quality Monitor</h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-emerald-500/5 border border-emerald-500/20 p-2 rounded">
              <p class="text-[10px] text-emerald-500">TESTS PASSED</p>
              <p class="text-xl font-bold">{{ data.quality.testsPassed }}/{{ data.quality.testsTotal }}</p>
            </div>
            <div class="bg-rose-500/5 border border-rose-500/20 p-2 rounded">
              <p class="text-[10px] text-rose-500">LINT ERRORS</p>
              <p class="text-xl font-bold">{{ data.quality.lintErrors }}</p>
            </div>
          </div>
        </div>

        <div class="bg-[#0c0c0c] border border-white/5 p-4 rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden">
          <h2 class="text-[11px] font-bold text-white/60 uppercase mb-3 flex items-center gap-2">
            <FileCode size="14" class="text-cyan-500" /> Generated Code
          </h2>
          <pre class="flex-1 bg-black/50 p-3 rounded font-mono text-[10px] text-emerald-400/80 overflow-auto border border-white/5 leading-relaxed">
{{ data.output.code || '// waiting for Coder agent...' }}
          </pre>
        </div>

        <!-- Resource Monitoring -->
        <div class="bg-[#0c0c0c] border border-white/5 p-4 rounded-lg">
          <h2 class="text-[11px] font-bold text-white/60 uppercase mb-3">Resources</h2>
          <div class="space-y-3">
            <div>
              <div class="flex justify-between text-[10px] mb-1">
                <span>CPU</span><span>{{ data.resources.cpu.toFixed(1) }}%</span>
              </div>
              <div class="h-1 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-cyan-400" :style="{ width: data.resources.cpu + '%' }"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-[10px] mb-1">
                <span>RAM</span><span>{{ data.resources.ram.toFixed(1) }}%</span>
              </div>
              <div class="h-1 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-400" :style="{ width: data.resources.ram + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
body { background: #050505; color: #e0e0e0; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
</style>
