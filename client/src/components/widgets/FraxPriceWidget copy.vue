<script setup>
/** Vendor */
import { ref, onMounted, useCssModule } from "vue"
import { DateTime } from "luxon"
import * as d3 from "d3"

/** Services */
import { abbreviate } from "@/services/amounts"

/** API */
import { fetchPrice, fetchPriceSeries } from "@/services/api/stats"

/** Store */
import { useAppStore } from "@/stores/app"
const appStore = useAppStore()

const cssModule = useCssModule()

const widgetEl = ref(null)
const chartEl = ref(null)

const price = ref(0)
const priceSeries = ref([])

const buildChart = () => {
	const data = priceSeries.value

	const width = widgetEl.value.wrapper.getBoundingClientRect().width
	const height = 120
	const marginTop = 0
	const marginRight = 0
	const marginBottom = 0
	const marginLeft = 0

	const MAX_VALUE = d3.max(data, (d) => d.value) || 1
	const MIN_VALUE = d3.min(data, (d) => d.value) || 0

	/** Scale */
	const x = d3.scaleUtc()
		.domain(d3.extent(data, (d) => d.date))
		.range([marginLeft, width - marginRight])

	const y = d3.scaleLinear()
		.domain([MIN_VALUE, MAX_VALUE])
		.range([height - marginBottom - 6, marginTop])

	const line = d3.line()
		.x((d) => x(d.date))
		.y((d) => y(d.value))

	/** SVG Container */
	const svg = d3.create("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", `0 0 ${width} ${height}`)
		.attr("preserveAspectRatio", "none")
		.style("max-width", "100%")
		.style("-webkit-tap-highlight-color", "transparent")

	/** Vertical Lines */
	svg.append("path")
		.attr("fill", "none")
		.attr("stroke", "var(--op-10)")
		.attr("stroke-width", 2)
		.attr("d", `M${marginLeft},${height - marginBottom + 2} L${marginLeft},${height - marginBottom - 5}`)
	svg.append("path")
		.attr("fill", "none")
		.attr("stroke", "var(--op-10)")
		.attr("stroke-width", 2)
		.attr("d", `M${width - 1},${height - marginBottom + 2} L${width - 1},${height - marginBottom - 5}`)

	/** Chart Line */
	svg.append("path")
		.attr("fill", "none")
		.attr("stroke", "var(--txt-secondary)")
		.attr("stroke-width", 2)
		.attr("stroke-linecap", "round")
		.attr("stroke-linejoin", "round")
		.attr("d", line(data))

	/** Filled Area */
	const svgDefs = svg.append("defs")
	const mainGradient = svgDefs.append("linearGradient")
		.attr("id", "mainGradient")
		.attr("gradientTransform", "rotate(90)")
	mainGradient.append("stop")
		.attr("class", cssModule["stop-left"])
		.attr("offset", "0")
	mainGradient.append("stop")
		.attr("class", cssModule["stop-right"])
		.attr("offset", "100")

	svg.append("path")
		.classed(cssModule.filled, true)
		.attr("d", `${line(data)}L${width},${height}L0,${height}L0,${y(data[0].value)}`)

	/** Dashed Line */
	svg.append("path")
		.attr("fill", "none")
		.attr("stroke", "var(--txt-secondary)")
		.attr("stroke-width", 2)
		.attr("stroke-linecap", "round")
		.attr("stroke-linejoin", "round")
		.attr("stroke-dasharray", "4")
		.attr("d", line(data.slice(data.length)))

	if (chartEl.value.children[0]) chartEl.value.children[0].remove()
	chartEl.value.append(svg.node())
}

onMounted(async () => {
	price.value = await fetchPrice()
	priceSeries.value = await fetchPriceSeries({ timeframe: "1d" })
	console.log("priceSeries.value", priceSeries.value)
	priceSeries.value = priceSeries.value.reverse().map((s) => ({
		date: DateTime.fromISO(s.time).toJSDate(),
		value: parseFloat(s.close),
	}))

	buildChart()
})
</script>

<template>
	<Flex ref="widgetEl" direction="column" justify="between" :class="$style.wrapper">
		<Flex wide justify="between">
			<Flex direction="column" gap="8">
				<Text size="16" weight="500" color="primary">Celestia Price</Text>
				<Text size="13" weight="500" color="tertiary">
					Market Cap: $647,323,973
				</Text>
			</Flex>

			<Text size="18" weight="600" color="primary" mono>${{ price.close }}</Text>
		</Flex>

		<div ref="chartEl" :class="$style.chart" />
	</Flex>
</template>

<style module>
.wrapper {
	min-width: 500px;

	background: var(--card-background);

	padding: 20px;
}

.stop-left {
	stop-color: rgba(255, 255, 255, 10%);
}

.stop-right {
	stop-color: rgba(255, 255, 255, 0%);
}

.filled {
	fill: url(#mainGradient);
}
</style>
