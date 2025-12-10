<script>
    import * as d3 from "d3";
    import { fade } from "svelte/transition";
    import { onMount } from "svelte";
    import chinaFoodImportsAnnual from "../data/china-soy-imports-by-country-annual.csv";
    import chinaFoodImportsMonthly from "../data/china-soy-imports-by-country-monthly.csv";
    import getValueFromCSSVar from "../utils/getValueFromCSSVar";
    import { isMobile } from "../stores/global.js";

    let { activeId } = $props();
    let areasGroup;
    let mounted = $state(false);

    onMount(() => {
        mounted = true;
    });

    // Helper function to parse monthly date from "09/2024" format
    const parseMonthlyDate = (monthStr) => {
        const [month, year] = monthStr.split("/");
        return new Date(+year, +month - 1, 1); // month is 0-indexed in Date
    };

    // Select and parse data based on view
    const allData = $derived.by(() => {
        const rawData =
            activeId === "china_soy_chart_monthly"
                ? chinaFoodImportsMonthly
                : chinaFoodImportsAnnual;

        if (activeId === "china_soy_chart_monthly") {
            // Parse monthly data
            return rawData.map((d) => ({
                ...d,
                value: +d.value,
                share: +d.share,
                date: parseMonthlyDate(d.month),
                month: d.month, // Keep original for display
            }));
        } else {
            // Parse annual data
            return rawData.map((d) => ({
                ...d,
                value: +d.value,
                share: +d.share,
                date: new Date(+d.year, 0, 1), // Convert year to date
                year: +d.year,
            }));
        }
    });

    const usColor = getValueFromCSSVar("--color-theme-us");
    const brazilColor = getValueFromCSSVar("--color-theme-brazil");

    // Get unique dates
    const dates = $derived.by(() => {
        return [...new Set(allData.map((d) => d.date.getTime()))]
            .map((t) => new Date(t))
            .sort((a, b) => a - b);
    });

    // Partners are fixed: US and Brazil
    const partners = ["United States", "Brazil"];

    // Create color scale for US and Brazil
    const getCountryColor = (partner) => {
        return partner === "United States" ? usColor : brazilColor;
    };

    // Chart dimensions
    const margin = $derived({ top: 20, right: $isMobile ? 40 : 20, bottom: 30, left: 40 });
    let textHeight = $state(80);
    let containerWidth = $state(400);
    let containerHeight = $state(500);
    
    // Calculate available space for chart (container height minus text height and margins)
    const marginTotal = 40; // 20px top + 20px bottom from chart-header
    const chartHeight = $derived.by(() => {
        return Math.max(300, containerHeight - textHeight - marginTotal);
    });
    
    const width = $derived(containerWidth);
    const height = $derived(chartHeight);
    const innerWidth = $derived(width - margin.left - margin.right);
    const innerHeight = $derived(height - margin.top - margin.bottom);

    // Create scales
    const xScale = $derived.by(() =>
        d3.scaleTime().domain(d3.extent(dates)).range([0, innerWidth]),
    );

    const yDomain = $derived.by(() => {
        // Calculate the sum of all countries for each date, then take the maximum
        const dateTotals = dates.map((date) => {
            const dateData = allData.filter(
                (d) => d.date.getTime() === date.getTime(),
            );
            return d3.sum(dateData, (d) => d.share);
        });
        const maxTotal = d3.max(dateTotals);
        return [0, maxTotal];
    });

    const yScale = $derived.by(() => {
        return d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);
    });

    // Prepare data for stacked area chart (US and Brazil only)
    const stackedData = $derived.by(() => {
        return d3
            .stack()
            .keys(partners)
            .value((d, key) => {
                const partnerData = d[key];
                return partnerData ? partnerData.share : 0;
            })(
            dates.map((date) => {
                const dateData = {};
                partners.forEach((partner) => {
                    const dataPoint = allData.find(
                        (d) =>
                            d.date.getTime() === date.getTime() &&
                            d.partner === partner,
                    );
                    dateData[partner] = dataPoint || { share: 0 };
                });
                dateData.date = date;
                return dateData;
            }),
        );
    });

    // Create area generator
    const area = $derived.by(() => {
        return d3
            .area()
            .x((d) => xScale(d.data.date))
            .y0((d) => yScale(d[0]))
            .y1((d) => yScale(d[1]))
            .curve(d3.curveMonotoneX);
    });

    // Create initial area generator for animation (all areas start at bottom)
    const initialArea = $derived.by(() => {
        return d3
            .area()
            .x((d) => xScale(d.data.date))
            .y0((d) => yScale(0))
            .y1((d) => yScale(0))
            .curve(d3.curveMonotoneX);
    });

    // Generate path data for each area
    const areaPaths = $derived.by(() => {
        return stackedData.map((d) => ({
            key: d.key,
            path: area(d),
            fill: getCountryColor(d.key),
        }));
    });

    // Create combined area path for masking (entire stacked area shape)
    const combinedAreaPath = $derived.by(() => {
        if (stackedData.length === 0 || dates.length === 0) return "";

        // Get the top stack (last one, which has the highest y values)
        const topStack = stackedData[stackedData.length - 1];

        // Create area generator that goes from bottom (innerHeight) to top of stack
        const combinedArea = d3
            .area()
            .x((d) => xScale(d.data.date))
            .y0(() => innerHeight) // Always start from bottom
            .y1((d) => yScale(d[1])) // Top of the stack
            .curve(d3.curveMonotoneX);

        return combinedArea(topStack);
    });

    // Generate axis data
    const xAxisData = $derived.by(() => {
        if (activeId === "china_soy_chart_monthly") {
            // For monthly view, show formatted month/year labels with fewer labels
            const monthAbbreviations = [
                "Jan.",
                "Feb.",
                "Mar.",
                "Apr.",
                "May",
                "Jun.",
                "Jul.",
                "Aug.",
                "Sep.",
                "Oct.",
                "Nov.",
                "Dec.",
            ];

            // Show every 3 months to reduce clutter
            return dates
                .filter(
                    (date, index) =>
                        index % 3 === 0 || index === dates.length - 1,
                ) // Show every 3rd month plus the last one
                .map((date) => {
                    const month = date.getMonth();
                    const year = date.getFullYear();
                    return {
                        value: date,
                        label: `${monthAbbreviations[month]} ${$isMobile ? `‘${year.toString().slice(-2)}` : year}`,
                        x: xScale(date),
                    };
                });
        } else {
            // For annual view, show year labels
            return dates.map((date) => ({
                value: date,
                label: String(date.getFullYear()),
                x: xScale(date),
            }));
        }
    });

    const yAxisData = $derived.by(() => {
        const ticks = yScale.ticks(5);
        return ticks
            .filter((tick) => tick !== 0) // Remove 0% from y-axis
            .map((tick) => ({
                value: tick,
                y: yScale(tick),
                label: d3.format(".0%")(tick),
            }));
    });

    // Title text
    const descriptionText = $derived(
        activeId === "china_soy_chart_annual"
            ? "Annually, 2016–2024"
            : "Monthly, Sept. 2024–Sept. 2025",
    );

    // Trump administration overlay data
    const trumpOverlays = $derived.by(() => {
        const overlays = [];

        if (activeId === "china_soy_chart_annual") {
            // First Trump administration for annual view
            const startDate = new Date(2016, 0, 1);
            const endDate = new Date(2020, 0, 1);
            const startX = xScale(startDate);
            const endX = xScale(endDate);
            const width = endX - startX;

            if (width > 0) {
                overlays.push({
                    x: startX,
                    width: width,
                    label: "First Trump administration",
                });
            }
        } else if (activeId === "china_soy_chart_monthly") {
            // Second Trump administration for monthly view (starts January 2025)
            const startDate = new Date(2025, 0, 1);
            const endDate =
                dates.length > 0
                    ? dates[dates.length - 1]
                    : new Date(2025, 8, 1); // Use last date in data or September 2025
            const startX = xScale(startDate);
            const endX = xScale(endDate);
            const width = endX - startX;

            if (width > 0) {
                overlays.push({
                    x: startX,
                    width: width,
                    label: "Second Trump administration",
                });
            }
        }

        return overlays;
    });

    const showTrumpOverlays = $derived.by(() => {
        return trumpOverlays.length > 0;
    });
</script>

<div
    class="area-chart-wrapper"
    transition:fade={{ duration: 250 }}
    style:--margin="{margin.top}px"
    style:--chart-text-height="{textHeight}px"
>
    {#if mounted}
        <div class="area-chart-inner">
            {#key activeId}
                <div
                    class="area-chart-container"
                    bind:clientWidth={containerWidth}
                    bind:clientHeight={containerHeight}
                    in:fade={{ duration: 500 }}
                    out:fade={{ duration: 500 }}
                >
                    <!-- Title and Description -->
                    <div class="chart-header" bind:clientHeight={textHeight}>
                        <div class="chart-title">
                            Share of China's soybean imports, by country
                        </div>
                        <div class="chart-description">
                            {descriptionText}
                        </div>
                    </div>

                    <svg width={width} height={height}>
                        <g transform="translate({margin.left},{margin.top})">
                            <!-- Mask definition for overlay -->
                            <defs>
                                <mask id="area-mask">
                                    <!-- Black background hides everything -->
                                    <rect
                                        width={innerWidth}
                                        height={innerHeight}
                                        fill="black"
                                    />
                                    <!-- White shape shows through (the stacked areas) -->
                                    <path d={combinedAreaPath} fill="white" />
                                </mask>
                            </defs>

                            <!-- Areas -->
                            {#each areaPaths as areaPath}
                                <path
                                    class="area"
                                    d={areaPath.path}
                                    fill={areaPath.fill}
                                />
                            {/each}

                            <!-- X Axis -->
                            <g
                                class="axis axis-x"
                                transform="translate(0,{innerHeight})"
                            >
                                {#each xAxisData as tick (tick.value)}
                                    <g transform="translate({tick.x},0)">
                                        <line
                                            y2="6"
                                            stroke="#e5e7eb"
                                            stroke-width="1"
                                        />
                                        <text
                                            y="9"
                                            dy="0.71em"
                                            text-anchor="middle"
                                        >
                                            {tick.label}
                                        </text>
                                    </g>
                                {/each}
                            </g>

                            <!-- Y Axis -->
                            <g class="axis axis-y">
                                {#each yAxisData as tick (tick.value)}
                                    <g transform="translate(0,{tick.y})">
                                        <line
                                            x2="-{innerWidth}"
                                            stroke="#f3f4f6"
                                            stroke-width="1"
                                        />
                                        <text
                                            x="-8"
                                            dy="0.32em"
                                            text-anchor="end"
                                        >
                                            {tick.label}
                                        </text>
                                    </g>
                                {/each}
                            </g>

                            <!-- Trump Administration Overlays -->
                            {#if showTrumpOverlays}
                                {#each trumpOverlays as overlay}
                                    <g
                                        class="trump-overlay-container"
                                        opacity={1}
                                    >
                                        <rect
                                            class="trump-overlay"
                                            x={overlay.x}
                                            y="0"
                                            width={overlay.width}
                                            height={innerHeight}
                                            mask="url(#area-mask)"
                                        />

                                        <line
                                            x1={overlay.x}
                                            x2={overlay.x}
                                            y1="0"
                                            y2={innerHeight}
                                            class="trump-overlay-line"
                                        />

                                        <line
                                            x1={overlay.x + overlay.width}
                                            x2={overlay.x + overlay.width}
                                            y1="0"
                                            y2={innerHeight}
                                            class="trump-overlay-line"
                                        />

                                        <text
                                            class="trump-label"
                                            x={overlay.x + overlay.width / 2}
                                            y={innerHeight / 2}
                                        >
                                            {overlay.label}
                                        </text>
                                    </g>
                                {/each}
                            {/if}
                        </g>
                    </svg>
                </div>
            {/key}
        </div>
    {/if}
</div>

<style lang="scss">
    .chart-header {
        margin-top: var(--margin);
        margin-bottom: var(--margin);
        text-align: center;
    }

    .chart-title {
        font-size: 24px;
        font-weight: 600;
        color: var(--color-gray-1000);
        font-family: var(--font-heading);
        margin-bottom: 8px;
        line-height: 1.2;
    }

    .chart-description {
        font-size: 14px;
        color: var(--color-gray-500);
        font-family: var(--font-heading);
        line-height: 1.4;
    }

    .area-chart-wrapper {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        background: #fff;
        z-index: 100;
        box-sizing: border-box;
    }

    .area-chart-inner {
        width: 100%;
        height: 100%;
        position: relative;
    }

    .area-chart-container {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        display: flex;
        flex-direction: column;
    }

    svg {
        display: block;
        border-radius: 8px;
    }

    .area {
        stroke: rgba(255, 255, 255, 0.8);
        stroke-width: 1.5;
        opacity: 0.8;
        transition: fill 0.3s ease;
    }

    .trump-overlay-container {
        transition: opacity 0.3s ease;
        .trump-overlay {
            pointer-events: none;
            fill: var(--color-gray-1000);
            stroke-width: 0;
            opacity: 0.25;
        }

        .trump-label {
            font-family: var(--font-heading);
            font-size: 16px;
            // font-weight: 600;
            stroke: #ddd;
            paint-order: stroke;
            stroke-width: 4;
            text-anchor: middle;
            pointer-events: none;
        }
    }

    .axis {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;

        text {
            font-size: 11px;
            font-weight: 500;
            fill: var(--color-gray-500);
        }

        &-x {
            .domain {
                stroke: #e5e7eb;
                stroke-width: 1;
            }

            .tick line {
                stroke: #e5e7eb;
                stroke-width: 1;
            }
        }

        &-y {
            .domain {
                stroke: #e5e7eb;
                stroke-width: 1;
            }

            .tick line {
                stroke: #f3f4f6;
                stroke-width: 1;
            }
        }
    }

    .legend {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
    }
</style>
