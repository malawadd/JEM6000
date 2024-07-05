<script setup>
/** Components */
import GlobeWidget from "@/components/widgets/GlobeWidget.vue"
import FraxPriceWidget from "@/components/widgets/FraxPriceWidget.vue"
import GasPriceWidget from "@/components/widgets/GasPriceWidget.vue"
import FraxEthPriceWidget from "@/components/widgets/FraxEthPriceWidget.vue"
</script>

<template>
	<Flex gap="20" :class="$style.wrapper">
		<Flex direction="column" gap="20">
			<GlobeWidget />

			<Flex gap="20" :class="$style.bottom">
				<FraxPriceWidget />
				<FraxEthPriceWidget />
				<!-- <BlobsFlowWidget /> -->
				<GasPriceWidget />
			</Flex>
		</Flex>

		<!-- <Flex direction="column" gap="20" :class="$style.right_column">
			<ActiveRollupsWidget />
			<StatsWidget />
		</Flex> -->
	</Flex>
</template>

<style module>
.wrapper {
	width: 100%;
	height: 100%;

	padding: 20px;
}

.left_column {
	width: 100%;

	& .bottom {
		min-height: 220px;
	}
}

.right_column {
	min-width: 400px;
	height: 100%;
}
</style>
