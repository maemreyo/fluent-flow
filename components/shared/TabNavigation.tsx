import { BarChart3, Repeat } from 'lucide-react'
import { TabsList, TabsTrigger } from '../ui/tabs'

interface TabNavigationProps {
  activeTab: string
}

export function TabNavigation({ activeTab }: TabNavigationProps) {
  return (
    <TabsList className="m-4 grid w-full flex-shrink-0 grid-cols-2">
      <TabsTrigger value="dashboard" className="text-xs">
        <BarChart3 className="h-4 w-4" />
        Dashboard
      </TabsTrigger>
      <TabsTrigger value="loops" className="text-xs">
        <Repeat className="h-4 w-4" />
        Loops
      </TabsTrigger>
      {/* <TabsTrigger value="conversations" className="text-xs">
        <Target className="h-4 w-4" />
        AI Chat
      </TabsTrigger> */}
      {/* <TabsTrigger value="debug" className="text-xs">
        <Bug className="h-4 w-4" />
        Debug
      </TabsTrigger> */}
      {/* TODO: Re-enable these tabs when ready to implement */}
      {/* <TabsTrigger value="recordings" className="text-xs">
        <Music className="h-4 w-4" />
        Records
      </TabsTrigger> */}
    </TabsList>
  )
}
