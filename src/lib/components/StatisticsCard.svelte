<script lang="ts">
  import Card from '$lib/components/ui/card/card.svelte';
  import NumberFlow from '@number-flow/svelte';
  
  export let totalSpent: number;
  export let totalWon: number;
  export let netResult: number;
</script>

<Card class="mt-4 p-6 shadow-lg">
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <!-- Total spent amount -->
    <div class="flex flex-col items-center">
      <p class="text-gray-600 text-sm">Montant total dépensé</p>
      <NumberFlow
        value={totalSpent}
        format={{ style: 'currency', currency: 'EUR', trailingZeroDisplay: 'stripIfInteger' }}
        class="text-2xl sm:text-3xl text-red-500"
        transformTiming={{ duration: 1000, easing: 'ease-in-out' }}
        spinTiming={{ duration: 1000, easing: 'ease-in-out' }}
        opacityTiming={{ duration: 500, easing: 'ease-out' }}
      />
    </div>

    <!-- Total won amount -->
    <div class="flex flex-col items-center">
      <p class="text-gray-600 text-sm">Montant total gagné</p>
      <NumberFlow
        value={totalWon}
        format={{ style: 'currency', currency: 'EUR', trailingZeroDisplay: 'stripIfInteger' }}
        class="text-2xl sm:text-3xl text-green-500"
        transformTiming={{ duration: 1000, easing: 'ease-in-out' }}
        spinTiming={{ duration: 1000, easing: 'ease-in-out' }}
        opacityTiming={{ duration: 500, easing: 'ease-out' }}
      />
    </div>

    <!-- Net result with NumberFlow animation -->
    <div class="flex flex-col items-center">
      <p class="text-gray-600 text-sm">Résultat net</p>
      <NumberFlow
        value={Math.abs(netResult)}
        prefix={netResult >= 0 ? '+' : '-'}
        format={{ style: 'currency', currency: 'EUR', trailingZeroDisplay: 'stripIfInteger' }}
        class="text-2xl sm:text-3xl font-bold"
        style="color: {netResult >= 0 ? '#10B981' : '#DC2626'};"
        transformTiming={{ duration: 1000, easing: 'ease-in-out' }}
        spinTiming={{ duration: 1000, easing: 'ease-in-out' }}
        opacityTiming={{ duration: 500, easing: 'ease-out' }}
      />
    </div>
  </div>
</Card>