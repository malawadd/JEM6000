FlexFlex
<script setup>
/** Vendor */
import { ref, onMounted, onUnmounted  } from "vue"

/** API */
import { fetchTps } from "@/services/api/general"

const tps = ref()

const fetchTpsData = async () => {
	tps.value = await fetchTps()
}

onMounted(() => {
	fetchTpsData()
	const intervalId = setInterval(fetchTpsData, 60000)

	// Clean up the interval when the component is unmounted
	onUnmounted(() => {
		clearInterval(intervalId)
	})
})
</script>

<template>
	<Flex direction="column" gap="12">
		<Flex align="center" gap="6">
			<Flex align="center" gap="6">
				<div v-for="(bar, idx) in 20"
					:class="[$style.bar, tps && (tps.current * 100) / tps.high > idx * 5 && $style.active]" />
			</Flex>

			<Flex align="center" :class="$style.current">
				<Text size="14" weight="600" color="primary" mono>
					{{ tps ? tps.current : 0 }}
				</Text>
			</Flex>
		</Flex>

		<Text size="12" weight="600" color="tertiary">Transactions last minute</Text>
	</Flex>
</template>

<style module>
.bar {
	width: 4px;
	height: 20px;

	border-radius: 50px;
	background: var(--op-10);

	&.active {
		background: var(--txt-secondary);
		box-shadow: 0 0 10px rgba(255, 255, 255, 50%);
	}
}

.current {
	height: 20px;

	border-radius: 5px;
	background: var(--op-10);

	padding: 0 6px;
}
</style>
