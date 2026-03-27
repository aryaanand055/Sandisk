`timescale 1ns / 1ps

module clk_divider_tb_fast;

    reg clk_in;
    reg rst_n;
    wire led;

    // Instantiate UUT
    clk_divider uut (
        .clk_in(clk_in),
        .rst_n(rst_n),
        .led(led)
    );

    // 100MHz clock (10ns period)
    always #5 clk_in = ~clk_in;

    initial begin
        // Initialize
        clk_in = 0;
        rst_n = 0;
        #100;
        rst_n = 1;

        // TEST CASE 4: Toggle Verification (Fast-Forward Simulation)
        // We simulate a 500ms real-time delay by forcing the counter near its toggle limit.
        $display("[%t] TEST CASE 4: Fast-Forward Toggle Verification Started", $time);
        
        // Let it run for a bit
        #100;
        
        // Force the counter to just before the toggle point: 49,999,990
        $display("[%t] FORCING: count <= 49,999,990", $time);
        force uut.count = 27'd49_999_990;
        #10; // 1 cycle
        release uut.count;

        // Wait for exactly 10 more clock cycles (100ns) plus small delay
        repeat (15) @(posedge clk_in);

        // Check if LED toggled to 1
        if (led === 1'b1) begin
            $display("[%t] Toggle Test Passed: LED toggled to 1 correctly.", $time);
        end else begin
            $display("[%t] ERROR: LED did not toggle to 1 after 50M cycles (simulated)!", $time);
        end

        // Wait for another 50M cycles (simulated) to toggle back to 0
        $display("[%t] FORCING: count <= 49,999,990 AGAIN", $time);
        force uut.count = 27'd49_999_990;
        #10;
        release uut.count;

        repeat (15) @(posedge clk_in);

        if (led === 1'b0) begin
            $display("[%t] Toggle Back Test Passed: LED toggled back to 0 correctly.", $time);
        end else begin
            $display("[%t] ERROR: LED did not toggle back to 0!", $time);
        end

        #100;
        $display("[%t] Fast-Forward Simulation Finished.", $time);
        $finish;
    end

endmodule
