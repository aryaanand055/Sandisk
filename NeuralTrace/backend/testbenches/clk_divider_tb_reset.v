`timescale 1ns / 1ps

module clk_divider_tb_reset;

    reg clk_in;
    reg rst_n;
    wire led;

    // Instantiate UUT
    clk_divider uut (
        .clk_in(clk_in),
        .rst_n(rst_n),
        .led(led)
    );

    // 100MHz clock
    always #5 clk_in = ~clk_in;

    initial begin
        // Reset check
        clk_in = 0;
        rst_n = 0;
        #100;
        rst_n = 1;

        // TEST CASE 5: Mid-Cycle Reset Test
        // Force count to 27'd1000
        force uut.count = 27'd1000;
        #10;
        release uut.count;

        // Mid-increment reset
        $display("[%t] TEST CASE 5: Mid-Cycle Reset Check", $time);
        #50; // Some increments
        rst_n = 0;
        #20;
        if (uut.count !== 27'd0 || led !== 1'b0) begin
            $display("[%t] ERROR: Reset during operation failed!", $time);
        end else begin
            $display("[%t] Mid-Cycle Reset Passed: count and led cleared correctly.", $time);
        end
        #100;
        $finish;
    end

endmodule
